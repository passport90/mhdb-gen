import { describe, it } from 'node:test'
import UsageError from '../src/errors/usage-error.js'
import assert from 'node:assert/strict'
import resolveRoute from '../src/router.js'
import syncController from '../src/controllers/sync.js'
import upsertController from '../src/controllers/upsert.js'

describe('resolveRoute', () => {
  it('returns the sync controller for the sync command', () => {
    assert.strictEqual(resolveRoute('sync'), syncController)
  })

  it('returns the upsert controller for the upsert command', () => {
    assert.strictEqual(resolveRoute('upsert'), upsertController)
  })

  describe('when the command is not registered', () => {
    it('throws a UsageError naming the unknown command', () => {
      assert.throws(
        () => resolveRoute('unknown'),
        (err: unknown) => err instanceof UsageError && /unknown command: 'unknown'/.test(err.message),
      )
    })
  })
})
