import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildSeasonIndexPagePath from '../../src/presenters/build-season-index-page-path.js'

describe('buildSeasonIndexPagePath', () => {
  it('composes `<year>/<season-segment>/index.html`', () => {
    assert.strictEqual(buildSeasonIndexPagePath(1066, 2), '1066/2-summer/index.html')
  })
})
