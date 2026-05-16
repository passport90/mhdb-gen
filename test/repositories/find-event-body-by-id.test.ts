import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findEventBodyById from '../../src/repositories/find-event-body-by-id.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventBodyById', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the seed insert and the SUT call. */
  let db: DatabaseSync

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('hydrates the body fields of the row at the given id, mapping snake_case columns to camelCase', () => {
    db.prepare(`
      INSERT INTO events (
        title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Battle of Hastings',
      '\nbody\n',
      'hash-1',
      '1066-10-14',
      '1066-10-14',
      1066,
      3,
      1,
    )

    /** Body fields hydrated by the SUT. */
    const body = findEventBodyById(db, 1)

    assert.strictEqual(body.title, 'Battle of Hastings')
    assert.strictEqual(body.description, '\nbody\n')
    assert.strictEqual(body.illustrationHash, 'hash-1')
    assert.strictEqual(body.startDate, '1066-10-14')
    assert.strictEqual(body.endDate, '1066-10-14')
  })
})
