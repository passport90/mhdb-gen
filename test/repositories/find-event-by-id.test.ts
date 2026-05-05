import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findEventById from '../../src/repositories/find-event-by-id.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventById', () => {
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

  it('hydrates the row at the given id into an EventToRender, mapping snake_case columns to camelCase', () => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'battle-of-hastings',
      'Battle of Hastings',
      '\nbody\n',
      'hash-1',
      '1066-10-14',
      '1066-10-14',
      1066,
      3,
      1,
    )

    /** Event hydrated by the SUT. */
    const event = findEventById(db, 1)

    assert.strictEqual(event.id, 1)
    assert.strictEqual(event.slug, 'battle-of-hastings')
    assert.strictEqual(event.title, 'Battle of Hastings')
    assert.strictEqual(event.description, '\nbody\n')
    assert.strictEqual(event.illustrationHash, 'hash-1')
    assert.strictEqual(event.startDate, '1066-10-14')
    assert.strictEqual(event.endDate, '1066-10-14')
    assert.strictEqual(event.seasonalYear, 1066)
    assert.strictEqual(event.season, 3)
    assert.strictEqual(event.position, 1)
    assert.match(event.updatedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})
