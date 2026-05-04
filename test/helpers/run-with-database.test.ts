import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import runWithDatabase from '../../src/helpers/run-with-database.js'
import { tmpdir } from 'node:os'

describe('runWithDatabase', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /**
   * Counts rows currently in the `events` table by opening a fresh handle —
   * deliberately separate from the SUT's connection so it observes only
   * persisted state on disk, not anything held open by the runner.
   *
   * @returns Number of rows in `events`.
   */
  const countPersistedEvents = (): number => {
    /** Database handle for this read; closed before return. */
    const db = new DatabaseSync(dbPath)

    /** Row count returned by the aggregate query. */
    const row = db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number }

    db.close()

    return row.count
  }

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs the body in autocommit, forwards its return value, and closes the connection', () => {
    /** Database handle captured from inside the body; usable only while the runner is in scope. */
    let capturedDb: DatabaseSync | undefined

    /** Value returned by the helper; the body's return value is forwarded. */
    const result = runWithDatabase(db => {
      capturedDb = db

      db.prepare(`
        INSERT INTO events (slug, title, description, start_date, end_date, seasonal_year, season, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('autocommitted', 'Title', 'body', '2026-01-01', '2026-12-31', 2026, 1, 1)

      return 'forwarded'
    })

    assert.strictEqual(result, 'forwarded')
    assert.strictEqual(countPersistedEvents(), 1)
    assert.throws(() => (capturedDb as DatabaseSync).exec('SELECT 1'))
  })

  describe('when the body throws', () => {
    it('closes the connection', () => {
      /** Database handle captured from inside the body; usable only while the runner is in scope. */
      let capturedDb: DatabaseSync | undefined

      assert.throws(() => runWithDatabase(db => {
        capturedDb = db
        throw new Error('forced failure')
      }))

      assert.throws(() => (capturedDb as DatabaseSync).exec('SELECT 1'))
    })
  })
})
