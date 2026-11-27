import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GitHub, Telegram } from './lucide-icons'

describe('filled brand icons', () => {
  it.each([GitHub, Telegram])('does not suppress filled paths', (Icon) => {
    const html = renderToStaticMarkup(createElement(Icon))
    expect(html).toContain('<path')
    expect(html).toContain('viewBox="0 0 496 512"')
    expect(html).not.toContain('fill:none')
  })
})
