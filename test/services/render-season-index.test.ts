import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderSeasonIndex from '../../src/services/render-season-index.js'
import { tmpdir } from 'node:os'

describe('renderSeasonIndex', () => {
  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so the real chain can query it. */
  let db: DatabaseSync

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /**
   * Inserts an event row carrying the columns this query path touches.
   *
   * @param year - Seasonal year of the row.
   * @param season - Season-within-year of the row.
   * @param position - Position-within-season of the row.
   * @param slug - Unique slug for the row.
   * @param title - Event title.
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
    outputDirPath = join(tmpDirPath, 'output')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('writes the season index to the slot folder, with timeline and adjacencies reflecting DB state', () => {
    insertEventRow(1066, 0, 1, 'earlier-slot', 'Earlier', '1066-01-01', '1066-01-02')
    insertEventRow(1066, 1, 1, 'first-event', 'First Event', '1066-04-15', '1066-04-22')
    insertEventRow(1066, 1, 2, 'second-event', 'Second Event', '1066-04-23', '1066-04-30')
    insertEventRow(1066, 2, 1, 'later-slot', 'Later', '1066-07-01', '1066-07-02')

    /** Slot being rendered. */
    const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

    renderSeasonIndex(db, outputDirPath, slot)

    /** Rendered season index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, '1066', '1-spring', 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>Spring 1066 - MHDB</title>'))
    assert.ok(indexHtml.includes('<a class="event-title" href="1066/1-spring/1-first-event/index.html">'
      + 'First Event</a>'))
    assert.ok(indexHtml.includes('<a class="event-title" href="1066/1-spring/2-second-event/index.html">'
      + 'Second Event</a>'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1066/0-winter/index.html">← Winter 1066</a>'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1066/2-summer/index.html">Summer 1066 →</a>'))
  })

  describe('when the slot has no events in the DB', () => {
    it('writes nothing — leaves the output tree as the upstream prune left it', () => {
      /** Slot being rendered; has zero rows in the DB. */
      const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

      renderSeasonIndex(db, outputDirPath, slot)

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
