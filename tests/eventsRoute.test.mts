// Integration-ish unit tests for the events ingestion route.
//
// Mocks Prisma + crypto signature so the actual route code runs end-to-end
// against a fake DB. We verify the ping path now REQUIRES crmUserId.
//
// Run with: node --import tsx --test tests/eventsRoute.test.mts

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const SECRET = 'test-secret'

// Set env BEFORE any route module imports.
process.env.CALLING_AGENT_INTEGRATION_SECRET = SECRET
process.env.CALLING_AGENT_INTEGRATION_TIMESTAMP_WINDOW = '300'

// In-process Prisma mock — must be installed before importing the route.
type FakeUser = { id: string; status: string }
const fakeUsers = new Map<string, FakeUser>()
fakeUsers.set('user-active', { id: 'user-active', status: 'ACTIVE' })
fakeUsers.set('user-inactive', { id: 'user-inactive', status: 'DISABLED' })
// Distinct second user — used by the precedence test below to prove the
// CRM picks the email-resolved user (user-A) and NOT the legacy-id user
// (user-B) when both are supplied.
fakeUsers.set('user-B', { id: 'user-B', status: 'ACTIVE' })

// Used to assert the route does (or does NOT) reach the DB write path.
let upsertCallCount = 0

// Email index for the new email-first lookup path. Keys are lower-cased
// so `findFirst({ email: { equals: x, mode: 'insensitive' } })` behaves
// like the real Mongo case-insensitive match.
const fakeUsersByEmail = new Map<string, FakeUser & { email: string }>()
fakeUsersByEmail.set('owner@example.com', {
  id: 'user-active',
  status: 'ACTIVE',
  email: 'owner@example.com',
})
fakeUsersByEmail.set('inactive@example.com', {
  id: 'user-inactive',
  status: 'DISABLED',
  email: 'inactive@example.com',
})
// Email-A → user-A (distinct from user-B above). Used by the precedence
// test to prove email wins over a co-supplied legacy ObjectId.
fakeUsersByEmail.set('user-a@example.com', {
  id: 'user-A',
  status: 'ACTIVE',
  email: 'user-a@example.com',
})
fakeUsers.set('user-A', { id: 'user-A', status: 'ACTIVE' })

const fakePrisma: any = {
  user: {
    findUnique: async ({ where }: any) => fakeUsers.get(where.id) || null,
    findFirst: async ({ where }: any) => {
      const emailExpr = where?.email
      if (!emailExpr) return null
      // We only emulate { equals, mode: 'insensitive' } — the route's only
      // shape today. Anything more exotic returns null.
      const target = String(emailExpr.equals || '').toLowerCase()
      if (!target) return null
      return fakeUsersByEmail.get(target) || null
    },
  },
  callingAgentLead: {
    findUnique: async () => null,
    upsert: async ({ create, where }: any) => {
      upsertCallCount += 1
      const now = new Date()
      return {
        id: 'fake-row-id',
        externalEventKey: where?.externalEventKey ?? create.externalEventKey,
        eventType: create.eventType ?? 'lead',
        externalCallId: create.externalCallId ?? '',
        customerPhone: create.customerPhone ?? '',
        crmUserId: create.crmUserId ?? null,
        createdAt: now,
        updatedAt: now,
      }
    },
  },
}

// Hook into the CJS module graph: route.ts compiled by tsx ends up requiring
// '@/lib/prisma' through tsconfig path mapping. Intercept that resolve and
// substitute a CJS shim that returns our in-memory fake.
//
// The shim is written to a per-process temp directory (mkdtempSync) so the
// repo working tree stays clean and parallel test runs don't race on the
// same path.
import { Module, createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const _require = createRequire(import.meta.url)
const shimRoot = mkdtempSync(path.join(os.tmpdir(), 'troika-crm-test-'))
const shimPath = path.join(shimRoot, 'fake-prisma.cjs')
writeFileSync(
  shimPath,
  [
    'module.exports = {',
    '  get prisma() { return globalThis.__FAKE_PRISMA },',
    '}',
  ].join('\n'),
)
process.on('exit', () => {
  try {
    rmSync(shimRoot, { recursive: true, force: true })
  } catch {
    /* best-effort cleanup */
  }
})
;(globalThis as any).__FAKE_PRISMA = fakePrisma

const origResolve = (Module as any)._resolveFilename
;(Module as any)._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === '@/lib/prisma') {
    return _require.resolve(shimPath)
  }
  return origResolve.call(this, request, ...rest)
}

// Now load the route handler.
const routeModule: any = await import('../app/api/integrations/calling-agent/events/route')
const POST = routeModule.POST

// Broadcaster — same module the route imports, so we can intercept events.
const broadcasterModule: any = await import('../lib/callingAgentLeadEvents')

function sign(secret: string, ts: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')
}

function makeRequest(bodyObj: unknown): Request {
  const body = JSON.stringify(bodyObj)
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = sign(SECRET, ts, body)
  return new Request('http://x/api/integrations/calling-agent/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-integration-signature': sig,
      'x-integration-timestamp': ts,
    },
    body,
  })
}

beforeEach(() => {
  // Re-register fake prisma each run in case a test mutated it.
  ;(globalThis as any).__FAKE_PRISMA = fakePrisma
  upsertCallCount = 0
  broadcasterModule._resetForTests()
})

test('ping without crmUserEmail or crmUserId returns 400', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:1',
      eventType: 'ping',
    }) as any,
  )
  assert.equal(res.status, 400)
  const j = await res.json()
  assert.equal(j.ok, false)
  assert.equal(j.ping, true)
  assert.match(String(j.error), /crmUserEmail.*required/i)
})

test('ping with crmUserEmail resolves to the user (new primary path)', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:email-ok',
      eventType: 'ping',
      crmUserEmail: 'OWNER@example.com', // case-insensitive
    }) as any,
  )
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.equal(j.ok, true)
  assert.equal(j.crmUserId, 'user-active')
  assert.equal(j.crmUserValidated, true)
})

test('ping with unknown crmUserEmail returns 400', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:email-unknown',
      eventType: 'ping',
      crmUserEmail: 'ghost@example.com',
    }) as any,
  )
  assert.equal(res.status, 400)
  const j = await res.json()
  assert.match(String(j.error), /not found/i)
})

test('ping with inactive-user crmUserEmail returns 400', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:email-inactive',
      eventType: 'ping',
      crmUserEmail: 'inactive@example.com',
    }) as any,
  )
  assert.equal(res.status, 400)
  const j = await res.json()
  assert.match(String(j.error), /not active/i)
})

test('ping with unknown crmUserId returns 400', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:2',
      eventType: 'ping',
      crmUserId: 'does-not-exist',
    }) as any,
  )
  assert.equal(res.status, 400)
  const j = await res.json()
  assert.equal(j.ok, false)
  assert.match(String(j.error), /not found/i)
})

test('ping with inactive crmUserId returns 400', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:3',
      eventType: 'ping',
      crmUserId: 'user-inactive',
    }) as any,
  )
  assert.equal(res.status, 400)
  const j = await res.json()
  assert.match(String(j.error), /not active/i)
})

test('ping with a valid ACTIVE crmUserId returns 200 and crmUserValidated=true', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:4',
      eventType: 'ping',
      crmUserId: 'user-active',
    }) as any,
  )
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.equal(j.ok, true)
  assert.equal(j.crmUserValidated, true)
})

test('rejects unsigned ping', async () => {
  const body = JSON.stringify({ externalEventKey: 'x', eventType: 'ping' })
  const req = new Request('http://x/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
  const res: Response = await POST(req as any)
  assert.equal(res.status, 401)
})

test('successful lead ingestion broadcasts an SSE event', async () => {
  const received: any[] = []
  broadcasterModule.subscribe((p: any) => received.push(p))

  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:c-broadcast-1:lead',
      eventType: 'lead',
      crmUserId: 'user-active',
      externalCallId: 'c-broadcast-1',
      customerPhone: '+919876543210',
    }) as any,
  )

  assert.equal(res.status, 201)
  assert.equal(upsertCallCount, 1)
  assert.equal(received.length, 1, 'broadcast should be called exactly once on success')
  const payload = received[0]
  assert.equal(payload.eventType, 'lead')
  assert.equal(payload.externalCallId, 'c-broadcast-1')
  assert.equal(payload.externalEventKey, 'troika_crm:c-broadcast-1:lead')
  assert.equal(payload.duplicate, false)
  assert.ok(payload.createdAt && payload.updatedAt)
})

test('ping does NOT broadcast (no DB row written)', async () => {
  const received: any[] = []
  broadcasterModule.subscribe((p: any) => received.push(p))

  await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:no-broadcast',
      eventType: 'ping',
      crmUserId: 'user-active',
    }) as any,
  )

  assert.equal(received.length, 0)
})

test('a throwing broadcast subscriber does not fail ingestion', async () => {
  // Two subscribers: first throws, second still receives. Ingestion must
  // succeed regardless — durable storage is the source of truth, SSE is
  // best-effort.
  broadcasterModule.subscribe(() => {
    throw new Error('intentional test failure')
  })
  const received: any[] = []
  broadcasterModule.subscribe((p: any) => received.push(p))

  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:c-throw-1:lead',
      eventType: 'lead',
      crmUserId: 'user-active',
      externalCallId: 'c-throw-1',
      customerPhone: '+919876543210',
    }) as any,
  )

  assert.equal(res.status, 201, 'ingestion must succeed even when a subscriber throws')
  assert.equal(upsertCallCount, 1)
  assert.equal(received.length, 1, 'remaining subscribers still receive the event')
})

// ── Precedence + error-classification (post-review fixes) ───────────────────

test('email is PRIMARY: when both email and legacy id are supplied, email wins', async () => {
  // Email points to user-A. Legacy id points to user-B (distinct). The
  // resolver must return user-A — and the ingestion route must store
  // user-A's id on the CallingAgentLead row. If we ever regress this,
  // older agents that gained a new email would still keep syncing to the
  // pre-migration owner (the bug from the review pass).
  const received: any[] = []
  broadcasterModule.subscribe((p: any) => received.push(p))

  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:c-precedence-1:lead',
      eventType: 'lead',
      crmUserEmail: 'user-a@example.com',
      crmUserId: 'user-B', // distinct legacy ID, must be ignored
      externalCallId: 'c-precedence-1',
      customerPhone: '+919876543210',
    }) as any,
  )

  assert.equal(res.status, 201)
  assert.equal(upsertCallCount, 1)
  assert.equal(received.length, 1, 'broadcast should fire on success')
  // The broadcast payload carries the resolved owner — must be user-A, not user-B.
  assert.equal(
    received[0].crmUserId,
    'user-A',
    `expected email-resolved user-A, got ${received[0].crmUserId}`,
  )
})

test('email-primary path: ping with both supplied resolves to email-owned user', async () => {
  const res: Response = await POST(
    makeRequest({
      externalEventKey: 'troika_crm:ping:precedence',
      eventType: 'ping',
      crmUserEmail: 'user-a@example.com',
      crmUserId: 'user-B',
    }) as any,
  )
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.equal(j.ok, true)
  assert.equal(j.crmUserId, 'user-A', 'ping must resolve via email when both present')
})

test('transient DB error during email lookup returns 500 (not 400)', async () => {
  // Swap in a prisma whose findFirst throws a non-malformed-ObjectId
  // error. The Calling-Agent backend classifies 5xx as transient and
  // schedules a retry; if we mis-classified this as 400, the queue row
  // would go permanent-failed and the lead would never sync.
  const originalPrisma = (globalThis as any).__FAKE_PRISMA
  const flakyPrisma = {
    ...originalPrisma,
    user: {
      ...originalPrisma.user,
      findFirst: async () => {
        const e: any = new Error('connection reset by peer')
        e.code = 'P2010' // generic transient Prisma error
        throw e
      },
    },
  }
  ;(globalThis as any).__FAKE_PRISMA = flakyPrisma
  try {
    const res: Response = await POST(
      makeRequest({
        externalEventKey: 'troika_crm:c-flaky-1:lead',
        eventType: 'lead',
        crmUserEmail: 'user-a@example.com',
        externalCallId: 'c-flaky-1',
        customerPhone: '+91',
      }) as any,
    )
    assert.equal(res.status, 500, 'transient DB error must surface as 500 so backend retries')
    const j = await res.json()
    assert.match(String(j.error), /transient/i)
    assert.equal(upsertCallCount, 0, 'must not write a row when lookup itself failed')
  } finally {
    ;(globalThis as any).__FAKE_PRISMA = originalPrisma
  }
})

test('malformed legacy ObjectId still returns 400 (permanent payload bug, not transient)', async () => {
  // Simulate Prisma's P2023 "Inconsistent column data" thrown when a
  // legacy crmUserId is not a valid 24-hex ObjectId. This is a permanent
  // payload bug — retrying won't help — so 400 is the right classification.
  const originalPrisma = (globalThis as any).__FAKE_PRISMA
  const malformedIdPrisma = {
    ...originalPrisma,
    user: {
      ...originalPrisma.user,
      findUnique: async () => {
        const e: any = new Error('Inconsistent column data: invalid ObjectId for field id')
        e.code = 'P2023'
        throw e
      },
    },
  }
  ;(globalThis as any).__FAKE_PRISMA = malformedIdPrisma
  try {
    const res: Response = await POST(
      makeRequest({
        externalEventKey: 'troika_crm:c-bad-objid:lead',
        eventType: 'lead',
        // NO email — force the legacy-id path.
        crmUserId: 'not-a-real-objectid',
        externalCallId: 'c-bad-objid',
        customerPhone: '+91',
      }) as any,
    )
    assert.equal(res.status, 400, 'malformed ObjectId must remain a permanent 400')
    const j = await res.json()
    assert.match(String(j.error), /invalid crmUserId format/i)
  } finally {
    ;(globalThis as any).__FAKE_PRISMA = originalPrisma
  }
})

test('transient DB error during legacy-id lookup returns 500 (not 400)', async () => {
  // Anything other than malformed-ObjectId thrown by the id-path lookup
  // must also be treated as transient. Otherwise a brief Mongo blip on
  // an older email-less agent permanently kills its sync queue.
  const originalPrisma = (globalThis as any).__FAKE_PRISMA
  const flakyIdPrisma = {
    ...originalPrisma,
    user: {
      ...originalPrisma.user,
      findUnique: async () => {
        const e: any = new Error('connection reset by peer')
        e.code = 'P2010'
        throw e
      },
    },
  }
  ;(globalThis as any).__FAKE_PRISMA = flakyIdPrisma
  try {
    const res: Response = await POST(
      makeRequest({
        externalEventKey: 'troika_crm:c-flaky-id:lead',
        eventType: 'lead',
        crmUserId: 'user-active', // valid-looking id, lookup itself fails
        externalCallId: 'c-flaky-id',
        customerPhone: '+91',
      }) as any,
    )
    assert.equal(res.status, 500)
    const j = await res.json()
    assert.match(String(j.error), /transient/i)
  } finally {
    ;(globalThis as any).__FAKE_PRISMA = originalPrisma
  }
})
