import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import runWithDatabaseTransaction from '../../src/helpers/run-with-database-transaction.js'
import { tmpdir } from 'node:os'

describe('runWithDatabaseTransaction', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /**
   * Counts rows currently in the `events` table by opening a fresh handle —
   * deliberately separate from the SUT's connection so it observes only
   * committed state, not in-flight transactions.
   *
   * @returns Number of rows in `events`.
   */
  const countCommittedEvents = (): number => {
    /** Database handle for this read; closed before return. */
    const db = new DatabaseSync(dbPath)

    /** Row count returned by the aggregate query. */
    const row = db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number }

    db.close()

    return row.count
  }

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('commits the writes, forwards the body return value, and closes the connection', () => {
    /** Database handle captured from inside the body; usable only while the runner is in scope. */
    let capturedDb: DatabaseSync | undefined

    /** Value returned by the helper; the body's return value is forwarded. */
    const result = runWithDatabaseTransaction(db => {
      capturedDb = db

      db.prepare(`
        INSERT INTO events (slug, title, description, start_date, end_date, seasonal_year, season, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('inside-tx', 'Title', 'body', '2026-01-01', '2026-12-31', 2026, 1, 1)

      return 'forwarded'
    })

    assert.strictEqual(result, 'forwarded')
    assert.strictEqual(countCommittedEvents(), 1)
    assert.throws(() => (capturedDb as DatabaseSync).exec('SELECT 1'))
  })

  describe('when the body throws', () => {
    it('rolls back the writes, re-throws the cause, and closes the connection', () => {
      /** Database handle captured from inside the body; usable only while the runner is in scope. */
      let capturedDb: DatabaseSync | undefined

      assert.throws(
        () => runWithDatabaseTransaction(db => {
          capturedDb = db

          db.prepare(`
            INSERT INTO events (slug, title, description, start_date, end_date, seasonal_year, season, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run('rolled-back', 'Title', 'body', '2026-01-01', '2026-12-31', 2026, 1, 1)

          throw new Error('forced failure')
        }),
        (err: unknown) => err instanceof Error && err.message === 'forced failure',
      )

      assert.strictEqual(countCommittedEvents(), 0)
      assert.throws(() => (capturedDb as DatabaseSync).exec('SELECT 1'))
    })
  })
})
