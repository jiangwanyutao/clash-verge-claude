import { describe, expect, it } from 'vitest'

import { routingSpeed } from './routing-speed'

const connection = (
  id: string,
  group: string,
  upload: number,
  download: number,
) => ({ id, chains: [group], upload, download }) as IConnectionsItem

describe('routingSpeed', () => {
  it('uses elapsed time and counts only continuing connections in each group', () => {
    const before = [
      connection('a', 'Claude-Verge', 100, 200),
      connection('b', 'Codex-Verge', 0, 0),
    ]
    const after = [
      connection('a', 'Claude-Verge', 400, 800),
      connection('b', 'Codex-Verge', 60, 120),
      connection('new', 'Claude-Verge', 999, 999),
    ]
    expect(routingSpeed(before, after, 1500)).toEqual({
      Claude: { up: 200, down: 400 },
      Codex: { up: 40, down: 80 },
    })
  })

  it('ignores reset counters and connections that changed groups or closed', () => {
    const before = [
      connection('a', 'Claude-Verge', 100, 200),
      connection('b', 'Claude-Verge', 0, 0),
    ]
    const after = [
      connection('a', 'Claude-Verge', 10, 20),
      connection('b', 'Codex-Verge', 100, 100),
    ]
    expect(routingSpeed(before, after, 1000)).toEqual({
      Claude: { up: 0, down: 0 },
      Codex: { up: 0, down: 0 },
    })
  })
})
