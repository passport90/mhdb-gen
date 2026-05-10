import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findNextSeasonWithEvents from '../../src/repositories/find-next-season-with-events.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findNextSeasonWithEvents', () => {
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
   * @param slug - Unique slug for the row.
   */
  const insertEventRow = (year: number, season: number, position: number, slug: string): void => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, 't', 'd', NULL, '2026-01-01', '2026-01-01', ?, ?, ?)
    `).run(slug, year, season, position)
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

  it('returns the closest later slot in (year, season) lexicographic order, crossing year boundary as needed', () => {
    insertEventRow(1066, 1, 1, 'a')
    insertEventRow(1066, 3, 1, 'b')
    insertEventRow(1067, 0, 1, 'c')

    /** Same-year next: from (1066, 1), the closest later slot is (1066, 3). */
    const sameYearNext = findNextSeasonWithEvents(db, 1066, 1)
    assert.deepStrictEqual(sameYearNext, { seasonalYear: 1066, season: 3 })

    /** Cross-year next: from (1066, 3), the closest later slot is (1067, 0). */
    const crossYearNext = findNextSeasonWithEvents(db, 1066, 3)
    assert.deepStrictEqual(crossYearNext, { seasonalYear: 1067, season: 0 })
  })

  describe('when no later slot has events', () => {
    it('returns null', () => {
      insertEventRow(1066, 1, 1, 'a')

      /** Next for the latest seeded slot — no later slot exists. */
      const nextSlot = findNextSeasonWithEvents(db, 1066, 1)

      assert.strictEqual(nextSlot, null)
    })
  })
})
