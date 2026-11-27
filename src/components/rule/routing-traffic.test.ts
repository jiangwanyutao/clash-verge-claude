import { describe, expect, it } from 'vitest'

import { routingTraffic } from './routing-traffic'

describe('routingTraffic', () => {
  it('counts only connections that traversed the exact group', () => {
    const connections = [
      { chains: ['node', 'Claude-Verge'], upload: 10, download: 20 },
      { chains: ['Codex-Verge'], upload: 30, download: 40 },
      { chains: ['Claude-Verge-extra'], upload: 50, download: 60 },
    ] as IConnectionsItem[]
    expect(routingTraffic(connections, 'Claude-Verge')).toEqual({
      count: 1,
      upload: 10,
      download: 20,
    })
    expect(routingTraffic(connections, 'Codex-Verge')).toEqual({
      count: 1,
      upload: 30,
      download: 40,
    })
  })
})
