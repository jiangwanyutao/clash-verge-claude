import { expect, it } from 'vitest'

import {
  canEditManualNode,
  validFingerprint,
  validHost,
  validPort,
  validPublicKey,
  validUuid,
} from './manual-exit-validation'

it('validates address, port and VLESS credentials', () => {
  expect(validHost('example.com')).toBe(true)
  expect(validHost('192.168.1.1')).toBe(true)
  expect(validHost('999.1.1.1')).toBe(false)
  expect(validHost('2001:db8::1')).toBe(true)
  expect(validPort('65535')).toBe(true)
  expect(validPort('65536')).toBe(false)
  expect(validUuid('12345678-1234-1234-1234-123456789abc')).toBe(true)
  expect(validUuid('bad')).toBe(false)
  expect(validPublicKey('A'.repeat(43))).toBe(true)
  expect(validPublicKey('bad')).toBe(false)
  expect(validFingerprint('chrome')).toBe(true)
  expect(validFingerprint('chrome bad')).toBe(false)
  expect(canEditManualNode({ type: 'vless', network: 'ws' })).toBe(false)
})
