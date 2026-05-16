import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findSeasonsWithEventsInYear from '../../src/repositories/find-seasons-with-events-in-year.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findSeasonsWithEventsInYear', () => {
  /** Tmp directory holding the test SQLite file. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT. */
  let db: DatabaseSync

  /**
   * Inserts an event row carrying just the columns this query touches.
   *
   * @param year - Seasonal year of the row.
   * @param season - Season-within-year of the row.
   * @param position - Position-within-season of the row.
   */
  const insertEventRow = (year: number, season: number, position: number): void => {
    db.prepare(`
      INSERT INTO events (
        title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES ('t', 'd', NULL, '2026-01-01', '2026-01-01', ?, ?, ?)
    `).run(year, season, position)
  }

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    /** Path to the test SQLite file. */
    const dbPath = join(tmpDirPath, 'test.sqlite')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('returns the distinct seasons within the year ascending, ignoring events from other years', () => {
    insertEventRow(1066, 1, 1)
    insertEventRow(1066, 3, 1)
    insertEventRow(1066, 1, 2)
    insertEventRow(1500, 2, 1)

    /** Seasons returned by the SUT for year 1066. */
    const seasons = findSeasonsWithEventsInYear(db, 1066)

    assert.deepStrictEqual(seasons, [1, 3])
  })
})
