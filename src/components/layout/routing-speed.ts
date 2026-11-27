export type RoutingSpeed = Record<
  'Claude' | 'Codex',
  { up: number; down: number }
>

export function routingSpeed(
  previous: IConnectionsItem[],
  current: IConnectionsItem[],
  elapsedMs: number,
): RoutingSpeed {
  const result: RoutingSpeed = {
    Claude: { up: 0, down: 0 },
    Codex: { up: 0, down: 0 },
  }
  if (elapsedMs <= 0) return result
  const before = new Map(
    previous.map((connection) => [connection.id, connection]),
  )
  for (const connection of current) {
    const old = before.get(connection.id)
    if (!old) continue
    for (const service of ['Claude', 'Codex'] as const) {
      if (
        !connection.chains?.includes(`${service}-Verge`) ||
        !old.chains?.includes(`${service}-Verge`)
      )
        continue
      result[service].up +=
        (Math.max(0, connection.upload - old.upload) * 1000) / elapsedMs
      result[service].down +=
        (Math.max(0, connection.download - old.download) * 1000) / elapsedMs
    }
  }
  return result
}
