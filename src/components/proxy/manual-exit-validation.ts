export type ManualNode = Record<string, unknown>

export function canEditManualNode(node: ManualNode): boolean {
  if (node.type === 'http' || node.type === 'socks5') return true
  return (
    node.type === 'vless' &&
    (!node.network || node.network === 'tcp') &&
    node.tls === true &&
    !!node['reality-opts']
  )
}

export function validHost(host: string): boolean {
  if (!host || host.length > 253 || /[\s/]/.test(host)) return false
  if (host.includes(':')) {
    try {
      new URL(`http://[${host}]`)
      return true
    } catch {
      return false
    }
  }
  if (/^[\d.]+$/.test(host))
    return (
      host.split('.').length === 4 &&
      host
        .split('.')
        .every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
    )
  return host
    .split('.')
    .every((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(part))
}

export const validPort = (port: string) =>
  /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535
export const validUuid = (uuid: string) =>
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(uuid)
export const validPublicKey = (key: string) => /^[A-Za-z0-9_-]{43}$/.test(key)
export const validFingerprint = (value: string) =>
  /^[a-z0-9_-]{1,32}$/i.test(value)
