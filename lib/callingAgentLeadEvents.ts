/**
 * In-process SSE broadcaster for CallingAgentLead create/update notifications.
 *
 * This is a thin notification layer — NOT a durable store. The Calling-Agent
 * backend's outbound queue + the CallingAgentLead Mongo collection remain the
 * source of truth. SSE only nudges connected browsers to refetch via the
 * existing /api/calling-agent-leads endpoint, which already enforces
 * USER / ADMIN / SUPERADMIN scoping.
 *
 * Multi-instance caveat (do not skip when scaling out):
 *   This broadcaster keeps subscribers in a module-level Set, so a Node
 *   process only sees events emitted in its own memory. If the CRM ever runs
 *   behind multiple Next.js instances (PM2 cluster, multiple containers,
 *   Vercel concurrent functions, etc.), events published on instance A will
 *   not reach SSE clients connected to instance B. To fix that, replace or
 *   augment this with one of:
 *     - Redis Pub/Sub (publish on broadcast, subscribe inside the SSE route),
 *     - MongoDB change streams on CallingAgentLead,
 *     - a managed pub/sub service (NATS, AWS SNS, etc.).
 *   Until then, run a single CRM instance, or accept that the UI may lag for
 *   clients connected to non-publishing instances (the durable queue still
 *   delivers the data — only the UI refresh is delayed until next reload).
 */

export interface CallingAgentLeadEventPayload {
  id: string
  eventType: string
  externalEventKey: string
  externalCallId: string
  customerPhone: string
  crmUserId: string | null
  createdAt: string
  updatedAt: string
  duplicate: boolean
}

type Subscriber = (payload: CallingAgentLeadEventPayload) => void

const subscribers: Set<Subscriber> = new Set()

/**
 * Register a listener. Returns an unsubscribe function the caller MUST run on
 * disconnect to prevent leaks. The set is intentionally per-process — see
 * the multi-instance note at the top of this file.
 */
export function subscribe(listener: Subscriber): () => void {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

/**
 * Fan out a CallingAgentLead create/update notification to all connected SSE
 * clients on this process. Each subscriber is invoked synchronously inside a
 * try/catch so one bad listener (closed controller, stale ref, etc.) cannot
 * break delivery for the others.
 *
 * Never throws — the ingestion route wraps this call defensively anyway,
 * but treating notification as best-effort here keeps the contract simple
 * for any future caller.
 */
export function broadcastCallingAgentLeadEvent(
  payload: CallingAgentLeadEventPayload,
): void {
  // forEach (instead of `for...of`) keeps this compatible with the
  // project's es5 tsconfig target without needing downlevelIteration.
  subscribers.forEach((listener) => {
    try {
      listener(payload)
    } catch (err) {
      // Best-effort fanout. A broken listener gets unsubscribed lazily when
      // the SSE route's controller cleanup runs; we just skip it here.
      console.warn('[CallingAgentLeadEvents] subscriber threw', err)
    }
  })
}

/** Exposed only for tests — do NOT use in product code. */
export function _subscriberCountForTests(): number {
  return subscribers.size
}

/** Exposed only for tests — clears all subscribers between cases. */
export function _resetForTests(): void {
  subscribers.clear()
}
