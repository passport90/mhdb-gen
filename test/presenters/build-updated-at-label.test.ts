import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildUpdatedAtLabel from '../../src/presenters/build-updated-at-label.js'

describe('buildUpdatedAtLabel', () => {
  it('formats a `YYYY-MM-DD HH:MM:SS` stamp as `Month D, YYYY HH:MM:SS`', () => {
    /** Formatted timestamp from a SQLite `datetime('now')` stamp. */
    const label = buildUpdatedAtLabel('2026-05-05 12:00:00')

    assert.strictEqual(label, 'May 5, 2026 12:00:00')
  })
})
