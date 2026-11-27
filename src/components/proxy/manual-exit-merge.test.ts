import { load } from 'js-yaml'
import { expect, it } from 'vitest'

import { findManualExit, putManualExit } from './manual-exit-merge'

it('adds and edits a node without losing other configuration', () => {
  const initial =
    'proxy-groups:\n  - name: group\n    type: select\n    proxies: [node]\n'
  const added = putManualExit(
    initial,
    { name: 'node', type: 'http', server: 'example.com', port: 8080 },
    false,
  )
  const updated = putManualExit(
    added,
    { name: 'node', type: 'http', server: 'example.com', port: 8081 },
    true,
  )
  expect(findManualExit(updated, 'node')?.port).toBe(8081)
  expect(
    (load(updated) as Record<string, unknown>)['proxy-groups'],
  ).toBeDefined()
  expect(() => putManualExit(updated, { name: 'node' }, false)).toThrow()
  expect(() => putManualExit(updated, { name: 'group' }, false)).toThrow()
})
