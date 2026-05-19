import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  subscribe,
  type CallingAgentLeadEventPayload,
} from '@/lib/callingAgentLeadEvents'

// SSE must stay open for the lifetime of the browser connection — disable
// Next.js response caching/static optimisation.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEARTBEAT_INTERVAL_MS = 25_000

/**
 * Server-Sent Events stream for AI Call Leads page realtime refresh.
 *
 * Contract:
 *   - Requires the same NextAuth session as /api/calling-agent-leads. We
 *     reject anonymous clients with 401.
 *   - We deliberately send only a MINIMAL notification (no row payload that
 *     would leak another user's lead). The browser refetches the scoped
 *     list endpoint, which already enforces USER/ADMIN/SUPERADMIN scoping.
 *     So the SSE payload itself can be safely fan-out across all sessions.
 *   - Heartbeat comment lines every 25s keep proxies/load balancers from
 *     dropping the idle connection.
 *   - On client disconnect (request.signal.abort), we unsubscribe + close
 *     the controller. No subscriber leak.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Resolve visibility scope ONCE at connection time so the subscriber
  // callback below doesn't hit Mongo on every broadcast. This mirrors the
  // scoping rules in /api/calling-agent-leads (route.ts) so SSE wake-ups
  // only fire for events this session could actually see in the list.
  const sessionUserId = session.user.id
  const role = session.user.role
  let allowedCrmUserIds: Set<string> | null = null // null === unrestricted (SUPERADMIN)
  if (role === 'SUPERADMIN') {
    allowedCrmUserIds = null
  } else if (role === 'ADMIN') {
    const adminUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { assignedUserIds: true },
    })
    allowedCrmUserIds = new Set(adminUser?.assignedUserIds || [])
  } else {
    allowedCrmUserIds = new Set([sessionUserId])
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let cleanedUp = false
      let heartbeat: ReturnType<typeof setInterval> | null = null
      let unsubscribe: (() => void) | null = null

      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      const safeEnqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // Controller already closed (client gone). Run cleanup so the
          // heartbeat interval and broadcaster subscription are released —
          // the abort handler is not guaranteed to fire in this path.
          cleanup()
        }
      }

      // Initial hello so the browser knows the stream is live. Useful when
      // debugging in DevTools' Network → EventStream tab.
      safeEnqueue(`: connected\n\n`)
      safeEnqueue(
        `event: hello\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`,
      )

      unsubscribe = subscribe((payload: CallingAgentLeadEventPayload) => {
        // Server-side scope filter: only deliver wake-ups for events this
        // session could actually see in the list endpoint. Cuts cross-tenant
        // refetch noise at high call volume. The list API still enforces
        // scoping authoritatively — this is a noise filter, not a security
        // boundary. A missing crmUserId on the event (rare, only when
        // resolution fell back to legacy id) is treated as "let it through"
        // so non-superadmins still see a refresh prompt rather than a stale
        // list; the subsequent list fetch will return [] if not authorized.
        if (allowedCrmUserIds !== null && payload.crmUserId) {
          if (!allowedCrmUserIds.has(payload.crmUserId)) return
        }
        // Send ONLY a minimal "something changed" ping — no id, eventKey,
        // callId, phone, or crmUserId. The browser refetches the scoped
        // list endpoint, which enforces USER/ADMIN/SUPERADMIN visibility.
        safeEnqueue(
          `event: calling-agent-lead\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`,
        )
      })

      heartbeat = setInterval(() => {
        // Comment-only line — clients silently discard but proxies see
        // traffic and won't time the connection out.
        safeEnqueue(`: heartbeat ${Date.now()}\n\n`)
      }, HEARTBEAT_INTERVAL_MS)

      // Browser disconnect / page unload.
      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Defeat nginx response buffering — without this the heartbeat / first
      // event can sit in a buffer for many seconds before the browser sees it.
      'X-Accel-Buffering': 'no',
    },
  })
}
