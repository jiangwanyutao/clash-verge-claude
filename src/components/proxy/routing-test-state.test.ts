import { expect, it } from 'vitest'

import {
  currentRoutingDelay,
  routingProtected,
  routingTestKey,
  routingTestTarget,
} from './routing-test-state'

it('tests the isolated runtime target only when the dedicated route is enabled', () => {
  expect(routingTestTarget('Claude', '住宅', true)).toBe('Claude-Verge:住宅')
  expect(routingTestTarget('Codex', '住宅', true)).toBe('Codex-Verge:住宅')
  expect(routingTestTarget('Claude', '住宅', false)).toBeNull()
  expect(routingTestTarget('Claude', '', true)).toBeNull()
})

it('does not display a late result for another exit or changed configuration', () => {
  const result = { key: routingTestKey('Claude', 'A', true, 'old'), value: 42 }
  expect(currentRoutingDelay(result.key, result)).toBe(42)
  expect(
    currentRoutingDelay(routingTestKey('Claude', 'B', true, 'old'), result),
  ).toBeNull()
  expect(
    currentRoutingDelay(routingTestKey('Claude', 'A', true, 'new'), result),
  ).toBeNull()
  expect(
    currentRoutingDelay(routingTestKey('Claude', 'A', false, 'old'), result),
  ).toBeNull()
})

it('does not claim protection outside rule mode', () => {
  expect(routingProtected(true, 'rule')).toBe(true)
  expect(routingProtected(true, 'global')).toBe(false)
  expect(routingProtected(true, 'direct')).toBe(false)
  expect(routingProtected(true, '')).toBe(false)
  expect(routingProtected(false, 'rule')).toBe(false)
})
