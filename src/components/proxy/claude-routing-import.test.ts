import { load } from 'js-yaml'
import { expect, it } from 'vitest'

import { importClaudeRouting } from './claude-routing-import'

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
