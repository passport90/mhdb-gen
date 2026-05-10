import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findNextYearWithEvents from '../../src/repositories/find-next-year-with-events.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findNextYearWithEvents', () => {
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

  it('returns the closest later year that has events, ignoring earlier years', () => {
    insertEventRow(1066, 1, 1, 'a')
    insertEventRow(1500, 1, 1, 'b')
    insertEventRow(2026, 1, 1, 'c')

    /** Next year for reference 1500 — should skip 1066 and return 2026. */
    const nextYear = findNextYearWithEvents(db, 1500)

    assert.strictEqual(nextYear, 2026)
  })

  describe('when no later year has events', () => {
    it('returns null', () => {
      insertEventRow(1066, 1, 1, 'a')

      /** Next year for reference 1066 — no later year exists. */
      const nextYear = findNextYearWithEvents(db, 1066)

      assert.strictEqual(nextYear, null)
    })
  })
})
