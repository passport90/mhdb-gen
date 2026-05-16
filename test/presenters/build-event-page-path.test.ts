import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildEventPagePath from '../../src/presenters/build-event-page-path.js'

describe('buildEventPagePath', () => {
  it('composes `<year>/<season-segment>/<position>-<slug>/index.html`', () => {
    assert.strictEqual(
      buildEventPagePath(1066, 3, 1, 'battle-of-hastings'),
      '1066/3-fall/1-battle-of-hastings/index.html',
    )
  })
})
