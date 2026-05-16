import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventListing from '../../src/types/event-listing.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderSeasonIndex from '../../src/services/render-season-index.js'
import { tmpdir } from 'node:os'

describe('renderSeasonIndex', () => {
  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; the SUT uses it only for adjacent-slot lookups. */
  let db: DatabaseSync

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /**
   * Inserts an event row carrying the columns the adjacent-slot lookups touch
   * (`seasonal_year`, `season`).
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
    outputDirPath = join(tmpDirPath, 'output')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('writes the season index to the slot folder, with timeline and adjacencies reflecting DB state', () => {
    insertEventRow(1066, 0, 1)
    insertEventRow(1066, 2, 1)

    /** Slot being rendered. */
    const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

    /**
     * Listings threaded into the SUT — two events in the rendered slot, plus one event
     * in an adjacent slot the SUT should filter out before projecting the timeline.
     */
    const listings: EventListing[] = [
      {
        id: 10,
        title: 'First Event',
        slug: 'first-event',
        startDate: '1066-04-15',
        endDate: '1066-04-22',
        seasonalYear: 1066,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
      {
        id: 11,
        title: 'Second Event',
        slug: 'second-event',
        startDate: '1066-04-23',
        endDate: '1066-04-30',
        seasonalYear: 1066,
        season: 1,
        position: 2,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
      {
        id: 12,
        title: 'Other Slot',
        slug: 'other-slot',
        startDate: '1066-07-01',
        endDate: '1066-07-02',
        seasonalYear: 1066,
        season: 2,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
    ]

    renderSeasonIndex(db, outputDirPath, slot, listings)

    /** Rendered season index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, '1066', '1-spring', 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>Spring 1066 - MHDB</title>'))
    assert.ok(indexHtml.includes('<a class="event-title" href="1066/1-spring/1-first-event/index.html">'
      + 'First Event</a>'))
    assert.ok(indexHtml.includes('<a class="event-title" href="1066/1-spring/2-second-event/index.html">'
      + 'Second Event</a>'))
    assert.ok(!indexHtml.includes('other-slot'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1066/0-winter/index.html">← Winter 1066</a>'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1066/2-summer/index.html">Summer 1066 →</a>'))
  })

  describe('when the slot has no events in the listings', () => {
    it('writes nothing — leaves the output tree as the upstream prune left it', () => {
      /** Slot being rendered; has zero entries in `listings`. */
      const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

      renderSeasonIndex(db, outputDirPath, slot, [])

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
