import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callingAgentEventSchema } from '@/lib/validators'
import { verifyIntegrationRequest } from '@/lib/integrationAuth'
import { broadcastCallingAgentLeadEvent } from '@/lib/callingAgentLeadEvents'

// Force-dynamic — we read request bodies and headers.
export const dynamic = 'force-dynamic'

function safeStringify(value: unknown): string | null {
  if (value === null || value === undefined) return null
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return null
  }
}

function parseDateTime(value: unknown): Date | null {
  if (!value) return null
  if (typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

/**
 * Ingestion endpoint for events pushed from the Calling-Agent backend.
 *
 * Auth: HMAC signature in X-Integration-Signature over
 *   "<X-Integration-Timestamp>.<raw body>" with CALLING_AGENT_INTEGRATION_SECRET.
 *
 * Idempotency: keyed on externalEventKey via Prisma upsert. A duplicate POST
 * returns the existing row with `duplicate: true` and never creates a second
 * record — the Calling-Agent retry worker depends on this.
 */
export async function POST(request: NextRequest) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'unreadable body' }, { status: 400 })
  }

  const sig = request.headers.get('x-integration-signature')
  const ts = request.headers.get('x-integration-timestamp')
  const authResult = verifyIntegrationRequest(rawBody, sig, ts)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = callingAgentEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }
  const event = parsed.data

  // CRM user resolution.
  //
  // Admins identify the owner by EMAIL (typed in the agent's Integrations
  // tab). The CRM resolves email → User._id at ingest time and stores the
  // ObjectId on CallingAgentLead.crmUserId so per-user scoping queries stay
  // index-friendly.
  //
  // Precedence: EMAIL is primary. Legacy `crmUserId` is only consulted when
  // email is absent. This matches the admin UI's stated contract — "Email
  // takes precedence" — and avoids a migration trap where an older agent
  // already carries a legacy ID, the admin adds an email expecting it to
  // win, but ingestion silently keeps writing to the old ID's owner.
  //
  // Error classification:
  //   - Genuine "user not found / inactive / malformed legacy ObjectId"
  //     errors are returned as 400 so the Calling-Agent retry worker marks
  //     them permanent (no point retrying a wrong email).
  //   - Unexpected Prisma / network / Mongo errors during lookup are
  //     thrown so the outer try/catch returns 500 — Calling-Agent treats
  //     those as transient and retries with backoff, preserving the
  //     durable-retry reliability contract.
  async function resolveCrmUserOrError(
    rawEmail: string | null | undefined,
    rawId: string | null | undefined,
    { required }: { required: boolean },
  ): Promise<{ ok: true; id: string | null } | { ok: false; status: number; error: string }> {
    const email = (rawEmail || '').trim().toLowerCase()
    const id = (rawId || '').trim()

    if (!email && !id) {
      if (required) {
        return {
          ok: false,
          status: 400,
          error: 'crmUserEmail (or legacy crmUserId) is required',
        }
      }
      return { ok: true, id: null }
    }

    let user: { id: string; status: string } | null = null
    let resolvedVia: 'email' | 'id' = email ? 'email' : 'id'

    if (email) {
      // Primary path. Case-insensitive equals — emails in the User
      // collection are stored as supplied, so we widen the match here.
      try {
        user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, status: true },
        })
      } catch (err) {
        // Prisma/Mongo problem during lookup — surface as 500 so the
        // Calling-Agent backend retries instead of marking permanent-failed.
        console.error('[CallingAgentEvents] email lookup failed', err)
        throw err
      }
      if (!user) {
        return {
          ok: false,
          status: 400,
          error: `crmUserEmail ${email} not found in Troika CRM`,
        }
      }
    } else {
      // Legacy ID-only path. Prisma throws PrismaClientKnownRequestError
      // P2023 (or similar) on a malformed ObjectId — that's a permanent
      // payload bug, not a transient infrastructure problem, so we map
      // it to 400. Other thrown errors propagate as 500.
      try {
        user = await prisma.user.findUnique({
          where: { id },
          select: { id: true, status: true },
        })
      } catch (err) {
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
        const code = (err as { code?: string })?.code || ''
        // Heuristic: malformed-ObjectId errors mention "objectid" and/or
        // come back as Prisma error code P2023 ("Inconsistent column data").
        // Anything else is treated as transient → rethrow → 500.
        const malformed = code === 'P2023' || msg.includes('objectid')
        if (malformed) {
          return { ok: false, status: 400, error: 'invalid crmUserId format' }
        }
        console.error('[CallingAgentEvents] id lookup failed', err)
        throw err
      }
      if (!user) {
        return {
          ok: false,
          status: 400,
          error: `crmUserId ${id} not found in Troika CRM`,
        }
      }
    }

    if (user.status !== 'ACTIVE') {
      return {
        ok: false,
        status: 400,
        error: resolvedVia === 'email'
          ? `crmUserEmail ${email} is not active`
          : `crmUserId ${id} is not active`,
      }
    }
    return { ok: true, id: user.id }
  }

  // Ping payload short-circuits the DB write — used by the admin "Test
  // Connection" button. crmUserId is REQUIRED on ping too: a ping exists
  // only to verify integration wiring, so returning ok=true without a
  // validated CRM user would mask the most common misconfiguration
  // (admin types a wrong/nonexistent ID into the form). Real lead/transfer
  // sync would then 400 on every event after the test passes.
  if (event.eventType === 'ping' || event.ping === true) {
    let resolved: Awaited<ReturnType<typeof resolveCrmUserOrError>>
    try {
      resolved = await resolveCrmUserOrError(
        event.crmUserEmail,
        event.crmUserId,
        { required: true },
      )
    } catch (err) {
      // Transient DB error during lookup — surface 500 so the caller (or
      // admin test button) treats it as retryable rather than permanent.
      console.error('[CallingAgentEvents] ping resolve failed', err)
      return NextResponse.json(
        { ok: false, ping: true, error: 'lookup failed (transient)' },
        { status: 500 },
      )
    }
    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, ping: true, error: resolved.error },
        { status: resolved.status },
      )
    }
    return NextResponse.json({
      ok: true,
      ping: true,
      crmUserId: resolved.id,
      crmUserValidated: true,
    })
  }

  // Real lead/transfer events: email-or-id is required by the validator
  // superRefine, but double-check at runtime so an invalid value does not
  // create an orphan record. A transient DB error here must surface as
  // 500 so the Calling-Agent retry worker retries instead of marking the
  // event permanent-failed.
  let resolved: Awaited<ReturnType<typeof resolveCrmUserOrError>>
  try {
    resolved = await resolveCrmUserOrError(
      event.crmUserEmail,
      event.crmUserId,
      { required: true },
    )
  } catch (err) {
    console.error('[CallingAgentEvents] resolve failed', err)
    return NextResponse.json(
      { error: 'lookup failed (transient)' },
      { status: 500 },
    )
  }
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  const resolvedCrmUserId = resolved.id

  const data = {
    eventType: event.eventType,
    externalCallId: event.externalCallId || '',
    callingUserId: event.callingUserId || null,
    agentId: event.agentId || null,
    agentName: event.agentName || null,
    crmUserId: resolvedCrmUserId,
    customerPhone: event.customerPhone || '',
    campaignId: event.campaignId || null,
    campaignName: event.campaignName || null,
    callDateTime: parseDateTime(event.callDateTime),
    duration: typeof event.duration === 'number' ? Math.round(event.duration) : null,
    summary: event.summary || null,
    transcriptJson: safeStringify(event.transcript),
    leadQualifierJson: safeStringify(event.leadQualifier),
    leadReason: event.leadReason || null,
    transferStatus: event.transferStatus || null,
    transferToNumber: event.transferToNumber || null,
    recordingStatus: event.recordingStatus || null,
    // Callback fields — null for non-callback events; persisted typed so
    // the UI can sort/filter by scheduledFor without parsing rawPayloadJson.
    scheduledFor: parseDateTime(event.scheduledFor),
    scheduledCallId: event.scheduledCallId || null,
    callbackReason: event.callbackReason || null,
    callbackTimezone: event.callbackTimezone || null,
    rawPayloadJson: safeStringify(event),
  }

  try {
    const existing = await prisma.callingAgentLead.findUnique({
      where: { externalEventKey: event.externalEventKey },
      select: { id: true },
    })

    const record = await prisma.callingAgentLead.upsert({
      where: { externalEventKey: event.externalEventKey },
      // Update path: refresh mutable fields (status, transcript, summary may
      // grow as the call finalises). Keep eventType + externalCallId stable.
      update: {
        agentName: data.agentName ?? undefined,
        crmUserId: data.crmUserId ?? undefined,
        customerPhone: data.customerPhone || undefined,
        campaignId: data.campaignId ?? undefined,
        campaignName: data.campaignName ?? undefined,
        callDateTime: data.callDateTime ?? undefined,
        duration: data.duration ?? undefined,
        summary: data.summary ?? undefined,
        transcriptJson: data.transcriptJson ?? undefined,
        leadQualifierJson: data.leadQualifierJson ?? undefined,
        leadReason: data.leadReason ?? undefined,
        transferStatus: data.transferStatus ?? undefined,
        transferToNumber: data.transferToNumber ?? undefined,
        recordingStatus: data.recordingStatus ?? undefined,
        scheduledFor: data.scheduledFor ?? undefined,
        scheduledCallId: data.scheduledCallId ?? undefined,
        callbackReason: data.callbackReason ?? undefined,
        callbackTimezone: data.callbackTimezone ?? undefined,
        rawPayloadJson: data.rawPayloadJson ?? undefined,
      },
      create: {
        externalEventKey: event.externalEventKey,
        ...data,
      },
    })

    // Notify connected SSE clients so the AI Call Leads page can refresh
    // immediately. Best-effort only: a broken broadcaster MUST NOT fail
    // ingestion (the durable Calling-Agent queue + DB row are the source
    // of truth; browsers will catch up on next manual refresh).
    try {
      broadcastCallingAgentLeadEvent({
        id: record.id,
        eventType: record.eventType,
        externalEventKey: record.externalEventKey,
        externalCallId: record.externalCallId,
        customerPhone: record.customerPhone,
        crmUserId: record.crmUserId,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        duplicate: !!existing,
      })
    } catch (broadcastErr) {
      console.warn(
        '[CallingAgentEvents] SSE broadcast failed (ingestion unaffected)',
        broadcastErr,
      )
    }

    return NextResponse.json(
      {
        ok: true,
        id: record.id,
        duplicate: !!existing,
        eventType: record.eventType,
      },
      { status: existing ? 200 : 201 },
    )
  } catch (err) {
    console.error('[CallingAgentEvents] upsert failed', err)
    return NextResponse.json(
      { error: 'internal error' },
      { status: 500 },
    )
  }
}
