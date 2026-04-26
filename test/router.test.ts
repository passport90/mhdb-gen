import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import resolveRoute from '../src/router.js'
import upsertController from '../src/controllers/upsert.js'

describe('resolveRoute', () => {
  it('returns the upsert controller for the upsert command', () => {
    assert.strictEqual(resolveRoute('upsert'), upsertController)
  })

  describe('when the command is not registered', () => {
    it('throws', () => {
      assert.throws(
        () => resolveRoute('unknown'),
        /unknown command: 'unknown'/,
      )
    })
  })
})
