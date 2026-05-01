import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import slugify from '../../src/services/slugify.js'

describe('slugify', () => {
  it('produces a URL-safe slug — lowercase ASCII word characters joined by single hyphens', () => {
    assert.strictEqual(
      slugify('  ---___Hello, Café Münchën! Tokyo 東京   --   1066_AD日本___---  '),
      'hello-cafe-munchen-tokyo-1066_ad',
    )
  })
})
