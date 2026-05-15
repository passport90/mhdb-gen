import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findEventsInSeason from '../../src/repositories/find-events-in-season.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventsInSeason', () => {
  /** Tmp directory holding the test SQLite file. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT. */
  let db: DatabaseSync

  /**
   * Inserts an event row carrying the columns this query touches.
   *
   * @param year - Seasonal year of the row.
   * @param season - Season-within-year of the row.
   * @param position - Position-within-season of the row.
   * @param slug - Unique slug for the row.
   * @param title - Event title (markdown).
   * @param startDate - Start date in `YYYY-MM-DD`.
   * @param endDate - End date in `YYYY-MM-DD`.
   */
  const insertEventRow = (
    year: number,
    season: number,
    position: number,
    slug: string,
    title: string,
    startDate: string,
    endDate: string,
  ): void => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, ?, 'd', NULL, ?, ?, ?, ?, ?)
    `).run(slug, title, startDate, endDate, year, season, position)
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

  it('returns the events in the slot, position-ordered, skinny shape (position/slug/title/startDate/endDate)', () => {
    insertEventRow(1066, 1, 2, 'second', 'Second Event', '1066-04-15', '1066-04-22')
    insertEventRow(1066, 1, 1, 'first', 'First Event', '1066-04-01', '1066-04-05')
    insertEventRow(1066, 3, 1, 'other-slot', 'Wrong Slot', '1066-10-14', '1066-10-14')

    /** Events returned by the SUT for slot (1066, 1). */
    const events = findEventsInSeason(db, 1066, 1)

    assert.deepStrictEqual(events, [
      { position: 1, slug: 'first', title: 'First Event', startDate: '1066-04-01', endDate: '1066-04-05' },
      { position: 2, slug: 'second', title: 'Second Event', startDate: '1066-04-15', endDate: '1066-04-22' },
    ])
  })
})
