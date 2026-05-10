import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildSeasonLabel from '../../src/presenters/build-season-label.js'

describe('buildSeasonLabel', () => {
  it('returns "<SeasonName> <Year>" for each of the four season numbers', () => {
    assert.strictEqual(buildSeasonLabel(1066, 0), 'Winter 1066')
    assert.strictEqual(buildSeasonLabel(1066, 1), 'Spring 1066')
    assert.strictEqual(buildSeasonLabel(1066, 2), 'Summer 1066')
    assert.strictEqual(buildSeasonLabel(1066, 3), 'Fall 1066')
  })
})
