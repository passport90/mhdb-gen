import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import runWithDatabase from '../../src/helpers/run-with-database.js'
import { tmpdir } from 'node:os'

describe('runWithDatabase', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
    process.env.MHDB_DB_PATH = join(tmpDir, 'test.sqlite')
  })

  afterEach(async () => {
    delete process.env.MHDB_DB_PATH
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('runs the callback with an open db, returns its value, then closes the db', () => {
    /** Database handle captured from the callback so we can verify it was closed. */
    let capturedDb: DatabaseSync | undefined

    /** Value returned by the callback. */
    const result = runWithDatabase(db => {
      capturedDb = db

      return 42
    })

    assert.strictEqual(result, 42)
    assert.ok(capturedDb)
    assert.throws(() => (capturedDb as DatabaseSync).exec('SELECT 1'))
  })

  describe('when the callback throws', () => {
    it('closes the db and propagates the throw', () => {
      /** Database handle captured from the callback. */
      let capturedDb: DatabaseSync | undefined

      assert.throws(
        () => runWithDatabase(db => {
          capturedDb = db

          throw new Error('boom')
        }),
        /boom/,
      )

      assert.ok(capturedDb)
      assert.throws(() => (capturedDb as DatabaseSync).exec('SELECT 1'))
    })
  })
})
