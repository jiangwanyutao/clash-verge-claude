export const routingTestKey = (
  service: string,
  exit: string,
  enabled: boolean,
  configuration: string,
) => JSON.stringify([service, exit, enabled, configuration])

export const routingTestTarget = (
  service: string,
  exit: string,
  enabled: boolean,
) => (enabled && exit ? `${service}-Verge:${exit}` : null)

export const currentRoutingDelay = (
  key: string,
  result: { key: string; value: number } | null,
) => (result?.key === key ? result.value : null)

export const routingProtected = (enabled: boolean, mode: string) =>
  enabled && mode === 'rule'
