// Tests for the callingAgentEventSchema (lib/validators.ts) and the
// per-eventType field requirements added after the first review pass.
//
// Run with: node --import tsx --test tests/callingAgentValidator.test.mts

import { test } from 'node:test'
import assert from 'node:assert/strict'

// Dynamic import — tsx's ESM loader doesn't reliably forward named exports
// from .ts CJS-style modules at instantiation time. A runtime import works.
const validatorsModule: any = await import('../lib/validators')
const { callingAgentEventSchema } = validatorsModule

test('ping is valid with only event key + type', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:ping:123',
    eventType: 'ping',
  })
  assert.equal(r.success, true)
})

test('ping with a crmUserId is also accepted (validation moves to route)', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:ping:123',
    eventType: 'ping',
    crmUserId: 'someid',
  })
  assert.equal(r.success, true)
})

test('lead event rejected when both crmUserEmail and crmUserId missing', () => {
  // New schema accepts either email (primary) or legacy id; neither
  // present should still fail. The reported path is crmUserEmail (the
  // primary field) — admins fix it by typing an email.
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'lead',
    externalCallId: 'c1',
    customerPhone: '+919876543210',
  })
  assert.equal(r.success, false)
  if (!r.success) {
    const paths = r.error.issues.map((i: { path: (string | number)[] }) => i.path.join('.'))
    assert.ok(
      paths.includes('crmUserEmail'),
      `expected crmUserEmail issue, got ${paths.join(',')}`,
    )
  }
})

test('lead event accepted with crmUserEmail alone (no legacy id)', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'lead',
    externalCallId: 'c1',
    customerPhone: '+919876543210',
    crmUserEmail: 'owner@example.com',
  })
  assert.equal(r.success, true)
})

test('lead event accepted with legacy crmUserId alone (no email)', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'lead',
    externalCallId: 'c1',
    customerPhone: '+919876543210',
    crmUserId: '64f000000000000000000001',
  })
  assert.equal(r.success, true)
})

test('lead event rejected when externalCallId missing', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'lead',
    crmUserId: 'u1',
    customerPhone: '+919876543210',
  })
  assert.equal(r.success, false)
  if (!r.success) {
    const paths = r.error.issues.map((i: { path: (string | number)[] }) => i.path.join('.'))
    assert.ok(paths.includes('externalCallId'))
  }
})

test('lead event rejected when customerPhone missing', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'lead',
    crmUserId: 'u1',
    externalCallId: 'c1',
  })
  assert.equal(r.success, false)
  if (!r.success) {
    const paths = r.error.issues.map((i: { path: (string | number)[] }) => i.path.join('.'))
    assert.ok(paths.includes('customerPhone'))
  }
})

test('transfer event rejected when both crmUserId and crmUserEmail are blank', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:transfer',
    eventType: 'transfer',
    crmUserId: '   ',
    crmUserEmail: '   ',
    externalCallId: 'c1',
    customerPhone: '+91',
  })
  assert.equal(r.success, false)
})

test('lead event accepted when all contract fields present', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'lead',
    crmUserId: '64f000000000000000000001',
    externalCallId: 'c1',
    customerPhone: '+919876543210',
    duration: 42,
    summary: 'demo asked',
    transcript: [{ role: 'user', content: 'demo' }],
  })
  assert.equal(r.success, true)
})

test('transfer event accepted when all contract fields present', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:transfer',
    eventType: 'transfer',
    crmUserId: '64f000000000000000000001',
    externalCallId: 'c1',
    customerPhone: '+919876543210',
    transferStatus: 'transferred',
  })
  assert.equal(r.success, true)
})

test('unknown eventType rejected', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:lead',
    eventType: 'something-else',
  })
  assert.equal(r.success, false)
})

test('callback event is accepted with email + call id + phone', () => {
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:callback:s1',
    eventType: 'callback',
    crmUserEmail: 'owner@example.com',
    externalCallId: 'c1',
    customerPhone: '+919876543210',
    scheduledFor: '2026-05-19T09:30:00.000Z',
    scheduledCallId: 's1',
    callbackReason: 'pricing discussion',
    callbackTimezone: 'Asia/Kolkata',
  })
  assert.equal(r.success, true)
})

test('callback event rejected without owner identifier (same as lead/transfer)', () => {
  // Callback shares the contract rule: must carry crmUserEmail or legacy id.
  const r = callingAgentEventSchema.safeParse({
    externalEventKey: 'troika_crm:c1:callback:s1',
    eventType: 'callback',
    externalCallId: 'c1',
    customerPhone: '+91',
  })
  assert.equal(r.success, false)
})
