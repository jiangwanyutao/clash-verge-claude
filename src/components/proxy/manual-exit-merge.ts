import { dump, load } from 'js-yaml'

type Node = Record<string, unknown>

function parseConfiguration(configuration: string): {
  config: Node
  proxies: Node[]
} {
  let parsed: unknown
  try {
    parsed = configuration.trim() ? load(configuration) : {}
  } catch {
    throw new Error('出口配置格式不正确，请先修正 YAML。')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('出口配置必须是 YAML 映射。')
  }
  const config = parsed as Node
  if (
    config.proxies !== undefined &&
    (!Array.isArray(config.proxies) ||
      config.proxies.some(
        (node) => !node || typeof node !== 'object' || Array.isArray(node),
      ))
  ) {
    throw new Error('出口配置中的节点列表格式不正确。')
  }
  return { config, proxies: (config.proxies ?? []) as Node[] }
}

export function findManualExit(
  configuration: string,
  name: string,
): Node | undefined {
  return parseConfiguration(configuration).proxies.find(
    (node) => node.name === name,
  )
}

export function putManualExit(
  configuration: string,
  node: Node,
  editing: boolean,
): string {
  const { config, proxies } = parseConfiguration(configuration)
  const name = node.name
  if (typeof name !== 'string' || !name.trim())
    throw new Error('请填写节点名称。')
  const index = proxies.findIndex((entry) => entry.name === name)
  if (editing && index < 0) throw new Error('原节点不存在，请重新打开配置。')
  if (!editing && index >= 0)
    throw new Error('节点名称已存在，请使用其他名称。')
  const groups = config['proxy-groups']
  if (
    Array.isArray(groups) &&
    groups.some(
      (group) => group && typeof group === 'object' && group.name === name,
    )
  ) {
    throw new Error('节点名称与代理组重复，请使用其他名称。')
  }
  const next = [...proxies]
  if (editing) next[index] = node
  else next.push(node)
  return dump({ ...config, proxies: next })
}
