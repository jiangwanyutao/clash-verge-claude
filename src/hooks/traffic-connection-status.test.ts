import { afterEach, expect, it, vi } from 'vitest'

import {
  getTrafficConnected,
  isTrafficSample,
  setTrafficConnected,
  subscribeTrafficConnected,
} from './traffic-connection-status'

it('accepts only numeric traffic samples', () => {
  expect(isTrafficSample({ up: 0, down: 1 })).toBe(true)
  expect(isTrafficSample({})).toBe(false)
  expect(isTrafficSample({ up: '0', down: 0 })).toBe(false)
  expect(isTrafficSample(null)).toBe(false)
})

afterEach(() => {
  setTrafficConnected(false)
  vi.useRealTimers()
})

it('requires a live sample, expires stale samples, and reports errors', () => {
  vi.useFakeTimers()
  const listener = vi.fn()
  const unsubscribe = subscribeTrafficConnected(listener)
  expect(getTrafficConnected()).toBe(false)
  setTrafficConnected(true)
  expect(getTrafficConnected()).toBe(true)
  vi.advanceTimersByTime(4000)
  setTrafficConnected(true)
  vi.advanceTimersByTime(4000)
  expect(getTrafficConnected()).toBe(true)
  vi.advanceTimersByTime(1000)
  expect(getTrafficConnected()).toBe(false)
  setTrafficConnected(true)
  setTrafficConnected(false)
  expect(getTrafficConnected()).toBe(false)
  expect(listener).toHaveBeenCalledTimes(4)
  unsubscribe()
})
