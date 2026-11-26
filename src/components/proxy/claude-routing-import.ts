import { dump, load } from 'js-yaml'

type Entry = Record<string, unknown>

const isEntry = (value: unknown): value is Entry =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const names = (value: unknown): string[] => {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
    throw new Error('出口引用必须是名称列表。')
  }
  return value as string[]
}

const entries = (value: unknown): Entry[] => {
  if (value === undefined) return []
  if (
    !Array.isArray(value) ||
    value.some((item) => !isEntry(item) || typeof item.name !== 'string')
  ) {
    throw new Error('节点和代理组必须包含 name 字段。')
  }
  return value as Entry[]
}

export function addSnapshotNodes(configuration: string, source: string) {
  let current: unknown
  let snapshot: unknown
  try {
    current = configuration.trim() ? load(configuration) : {}
    snapshot = load(source)
  } catch {
    throw new Error('YAML 格式错误，请检查文件。')
  }
  if (!isEntry(current) || !isEntry(snapshot)) {
    throw new Error('请选择 YAML 格式的节点文件。')
  }
  const existing = entries(current.proxies)
  const groups = entries(current['proxy-groups'])
  const incoming = entries(snapshot.proxies)
  if (!incoming.length) throw new Error('文件中没有可导入的节点。')
  const known = new Set([...existing, ...groups].map((item) => item.name))
  for (const node of incoming) {
    if (known.has(node.name)) throw new Error('节点名称重复，请先重命名。')
    known.add(node.name)
  }
  return {
    configuration: dump({ ...current, proxies: [...existing, ...incoming] }),
    names: incoming.map((node) => node.name as string),
  }
}

export function importClaudeRouting(source: string, service = 'Claude') {
  let document: unknown
  try {
    document = load(source)
  } catch {
    // Parser diagnostics can contain subscription credentials from the source.
    throw new Error('YAML 格式错误，请检查缩进和引号。')
  }
  if (!isEntry(document)) throw new Error('请选择 YAML 格式的出口配置。')

  const proxies = entries(document.proxies)
  const groups = entries(document['proxy-groups'])
  const providers = document['proxy-providers'] ?? {}
  if (!isEntry(providers)) throw new Error('代理集合必须使用名称映射。')
  const outboundEntries = [...proxies, ...groups]
  const outbounds = new Map(
    outboundEntries.map((item) => [item.name as string, item]),
  )
  if (outbounds.size !== outboundEntries.length) {
    throw new Error('节点或代理组名称重复，请先重命名。')
  }

  const root = groups.find((group) => group.name === service)
  const exitNames = root
    ? names(root.proxies)
    : outboundEntries.map((item) => item.name as string)
  if (!exitNames.length) {
    throw new Error('没有找到可选出口；代理集合需要一个引用它的代理组。')
  }

  const usedOutbounds = new Set<string>()
  const usedProviders = new Set<string>()
  const visiting = new Set<string>(root ? [service] : [])
  const visitOutbound = (name: string) => {
    if (name === 'DIRECT' || name === 'REJECT') return
    if (visiting.has(name)) throw new Error('出口配置包含循环引用。')
    if (usedOutbounds.has(name)) return
    const item = outbounds.get(name)
    if (!item) throw new Error(`找不到出口：${name}`)
    visiting.add(name)
    for (const dependency of names(item.proxies)) visitOutbound(dependency)
    for (const provider of names(item.use)) visitProvider(provider)
    if (typeof item['dialer-proxy'] === 'string')
      visitOutbound(item['dialer-proxy'])
    visiting.delete(name)
    usedOutbounds.add(name)
  }
  const visitProvider = (name: string) => {
    const key = `provider:${name}`
    if (visiting.has(key)) throw new Error('订阅下载代理包含循环引用。')
    if (usedProviders.has(name)) return
    const provider = providers[name]
    if (!isEntry(provider)) throw new Error(`找不到代理集合：${name}`)
    visiting.add(key)
    if (typeof provider.proxy === 'string') visitOutbound(provider.proxy)
    if (
      isEntry(provider.override) &&
      typeof provider.override['dialer-proxy'] === 'string'
    ) {
      visitOutbound(provider.override['dialer-proxy'])
    }
    visiting.delete(key)
    usedProviders.add(name)
  }
  for (const name of exitNames) visitOutbound(name)

  return {
    configuration: dump({
      proxies: proxies.filter((item) => usedOutbounds.has(item.name as string)),
      'proxy-groups': groups.filter((item) =>
        usedOutbounds.has(item.name as string),
      ),
      'proxy-providers': Object.fromEntries(
        [...usedProviders].map((name) => [name, providers[name]]),
      ),
    }),
    exit_names: exitNames,
    selected_exit: exitNames[0],
  }
}
