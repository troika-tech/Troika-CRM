// Unit tests for lib/callingAgentLeadEvents — the in-process SSE broadcaster.
//
// Run with: node --import tsx --test tests/callingAgentLeadEvents.test.mts

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const mod: any = await import('../lib/callingAgentLeadEvents')
const {
  subscribe,
  broadcastCallingAgentLeadEvent,
  _subscriberCountForTests,
  _resetForTests,
} = mod

const payload = {
  id: 'row-1',
  eventType: 'lead',
  externalEventKey: 'troika_crm:c1:lead',
  externalCallId: 'c1',
  customerPhone: '+919876543210',
  crmUserId: 'u1',
  createdAt: '2026-05-18T10:00:00.000Z',
  updatedAt: '2026-05-18T10:00:00.000Z',
  duplicate: false,
}

beforeEach(() => {
  _resetForTests()
})

test('subscribe registers a listener and unsubscribe removes it', () => {
  assert.equal(_subscriberCountForTests(), 0)
  const unsubscribe = subscribe(() => {})
  assert.equal(_subscriberCountForTests(), 1)
  unsubscribe()
  assert.equal(_subscriberCountForTests(), 0)
})

test('broadcast fans out to all live subscribers', () => {
  const seenA: unknown[] = []
  const seenB: unknown[] = []
  subscribe((p) => seenA.push(p))
  subscribe((p) => seenB.push(p))
  broadcastCallingAgentLeadEvent(payload)
  assert.deepEqual(seenA, [payload])
  assert.deepEqual(seenB, [payload])
})

test('broadcast does NOT deliver to an unsubscribed listener', () => {
  const seenA: unknown[] = []
  const seenB: unknown[] = []
  const offA = subscribe((p) => seenA.push(p))
  subscribe((p) => seenB.push(p))
  offA()
  broadcastCallingAgentLeadEvent(payload)
  assert.deepEqual(seenA, [])
  assert.deepEqual(seenB, [payload])
})

test('a throwing subscriber does not break delivery to other subscribers', () => {
  const seen: unknown[] = []
  subscribe(() => {
    throw new Error('boom')
  })
  subscribe((p) => seen.push(p))
  // Must not throw.
  assert.doesNotThrow(() => broadcastCallingAgentLeadEvent(payload))
  assert.deepEqual(seen, [payload])
})

test('broadcast with zero subscribers is a no-op (does not throw)', () => {
  assert.doesNotThrow(() => broadcastCallingAgentLeadEvent(payload))
})

test('calling the same unsubscribe twice is safe', () => {
  const off = subscribe(() => {})
  assert.equal(_subscriberCountForTests(), 1)
  off()
  assert.doesNotThrow(off)
  assert.equal(_subscriberCountForTests(), 0)
})
