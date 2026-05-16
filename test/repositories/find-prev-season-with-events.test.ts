import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findPrevSeasonWithEvents from '../../src/repositories/find-prev-season-with-events.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findPrevSeasonWithEvents', () => {
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

  it('returns the closest earlier slot in (year, season) lexicographic order, crossing year boundary as needed', () => {
    insertEventRow(1066, 1, 1)
    insertEventRow(1066, 3, 1)
    insertEventRow(1067, 0, 1)

    /** Same-year prev: from (1066, 3), the closest earlier slot is (1066, 1). */
    const sameYearPrev = findPrevSeasonWithEvents(db, 1066, 3)
    assert.deepStrictEqual(sameYearPrev, { seasonalYear: 1066, season: 1 })

    /** Cross-year prev: from (1067, 0), the closest earlier slot is (1066, 3). */
    const crossYearPrev = findPrevSeasonWithEvents(db, 1067, 0)
    assert.deepStrictEqual(crossYearPrev, { seasonalYear: 1066, season: 3 })
  })

  describe('when no earlier slot has events', () => {
    it('returns null', () => {
      insertEventRow(1066, 1, 1)

      /** Prev for the earliest seeded slot — no earlier slot exists. */
      const prevSlot = findPrevSeasonWithEvents(db, 1066, 1)

      assert.strictEqual(prevSlot, null)
    })
  })
})
