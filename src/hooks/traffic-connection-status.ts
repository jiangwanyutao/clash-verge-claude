let connected = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

export function isTrafficSample(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const sample = value as Record<string, unknown>
  return ['up', 'down'].every(
    (key) => typeof sample[key] === 'number' && Number.isFinite(sample[key]),
  )
}

export const getTrafficConnected = () => connected

export function subscribeTrafficConnected(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setTrafficConnected(value: boolean) {
  if (timer) clearTimeout(timer)
  timer = value ? setTimeout(() => setTrafficConnected(false), 5000) : undefined
  if (connected !== value) {
    connected = value
    listeners.forEach((listener) => listener())
  }
}
