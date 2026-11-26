import { load } from 'js-yaml'
import { expect, it } from 'vitest'

import { addSnapshotNodes, importClaudeRouting } from './claude-routing-import'

it('imports the selected service group independently', () => {
  const source = `
proxies:
  - {name: ClaudeNode, type: http}
  - {name: CodexNode, type: http}
proxy-groups:
  - {name: Claude, type: select, proxies: [ClaudeNode]}
  - {name: Codex, type: select, proxies: [CodexNode]}
`
  expect(importClaudeRouting(source).exit_names).toEqual(['ClaudeNode'])
  expect(importClaudeRouting(source, 'Codex').exit_names).toEqual(['CodexNode'])
})

it('adds fixed nodes from a subscription cache without replacing configured exits', () => {
  const result = addSnapshotNodes(
    'proxies: [{name: Old, type: http}]\nproxy-groups: [{name: Existing, type: select, proxies: [Old]}]',
    'proxies: [{name: VPS, type: vless, server: example.test, port: 443}]',
  )
  expect(result.names).toEqual(['VPS'])
  expect(load(result.configuration)).toEqual({
    proxies: [
      { name: 'Old', type: 'http' },
      { name: 'VPS', type: 'vless', server: 'example.test', port: 443 },
    ],
    'proxy-groups': [{ name: 'Existing', type: 'select', proxies: ['Old'] }],
  })
  expect(() =>
    addSnapshotNodes(result.configuration, 'proxies: [{name: VPS}]'),
  ).toThrow('名称重复')
  expect(() => addSnapshotNodes('', 'proxies: []')).toThrow('没有可导入')
})

it('imports only Claude exits and preserves provider download dependencies', () => {
  const result = importClaudeRouting(`
mixed-port: 7897
rules: [MATCH,DIRECT]
proxies:
  - {name: Static, type: http}
  - {name: Download, type: vless}
  - {name: Dialer, type: http}
  - {name: Unrelated, type: http}
proxy-providers:
  US: {type: http, url: 'https://example.test/sub', proxy: Download, override: {dialer-proxy: Dialer}}
proxy-groups:
  - {name: Claude, type: select, proxies: [US Exit, Static]}
  - {name: US Exit, type: select, use: [US]}
  - {name: Other, type: select, proxies: [Unrelated]}
`)
  expect(result.exit_names).toEqual(['US Exit', 'Static'])
  expect(load(result.configuration)).toEqual({
    proxies: [
      { name: 'Static', type: 'http' },
      { name: 'Download', type: 'vless' },
      { name: 'Dialer', type: 'http' },
    ],
    'proxy-groups': [{ name: 'US Exit', type: 'select', use: ['US'] }],
    'proxy-providers': {
      US: {
        type: 'http',
        url: 'https://example.test/sub',
        proxy: 'Download',
        override: { 'dialer-proxy': 'Dialer' },
      },
    },
  })
})

it('rejects unresolved and cyclic exits rather than silently losing them', () => {
  expect(() =>
    importClaudeRouting('proxy-groups: [{name: Claude, proxies: [Missing]}]'),
  ).toThrow('找不到出口')
  expect(() =>
    importClaudeRouting(
      'proxy-groups: [{name: Claude, proxies: [Loop]}, {name: Loop, proxies: [Claude]}]',
    ),
  ).toThrow('循环引用')
  expect(() => importClaudeRouting('proxies: secret: invalid')).toThrow(
    'YAML 格式错误',
  )
  expect(() => importClaudeRouting('rules: [MATCH,DIRECT]')).toThrow(
    '没有找到可选出口',
  )
})
