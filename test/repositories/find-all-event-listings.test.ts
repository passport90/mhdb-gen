import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventSlot from '../../src/types/event-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findAllEventListings from '../../src/repositories/find-all-event-listings.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findAllEventListings', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the seed inserts and the SUT call. */
  let db: DatabaseSync

  /**
   * Inserts a row into `events` at the given slot with controlled timestamp columns,
   * bypassing the `updated_at` trigger so the listings' raw timestamps land
   * deterministically.
   *
   * @param slot - Slot stored in the row's `(seasonal_year, season, position)` columns.
   * @param title - Title stored in the row.
   * @param startDate - Start date stored in the row.
   * @param endDate - End date stored in the row.
   * @param renderedAt - Value for `rendered_at`; `null` is the never-rendered arm.
   * @param updatedAt - Value for `updated_at`.
   */
  const insertEventRow = (
    slot: EventSlot,
    title: string,
    startDate: string,
    endDate: string,
    renderedAt: string | null,
    updatedAt: string,
  ): void => {
    db.prepare(`
      INSERT INTO events (
        title, description, start_date, end_date,
        seasonal_year, season, position,
        updated_at, rendered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      'body',
      startDate,
      endDate,
      slot.seasonalYear,
      slot.season,
      slot.position,
      updatedAt,
      renderedAt,
    )
  }

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('returns each event listing with raw timestamps, ordered by (seasonal_year, season, position)', () => {
    insertEventRow(
      { seasonalYear: 2026, season: 2, position: 1 },
      'Next Summer',
      '2026-07-01',
      '2026-07-08',
      '2026-06-01 00:00:00',
      '2026-05-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2025, season: 1, position: 1 },
      'Last Spring',
      '2025-04-01',
      '2025-04-08',
      null,
      '2025-04-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2026, season: 1, position: 2 },
      'Next Spring Second',
      '2026-04-23',
      '2026-04-30',
      '2026-04-15 00:00:00',
      '2026-04-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2026, season: 1, position: 1 },
      'Next Spring First',
      '2026-04-15',
      '2026-04-22',
      '2026-04-15 00:00:00',
      '2026-04-01 00:00:00',
    )

    /** Listings returned by the SUT. */
    const listings = findAllEventListings(db)

    assert.strictEqual(listings.length, 4)

    assert.strictEqual(listings[0]?.id, 2)
    assert.strictEqual(listings[0]?.title, 'Last Spring')
    assert.strictEqual(listings[0]?.startDate, '2025-04-01')
    assert.strictEqual(listings[0]?.endDate, '2025-04-08')
    assert.strictEqual(listings[0]?.seasonalYear, 2025)
    assert.strictEqual(listings[0]?.season, 1)
    assert.strictEqual(listings[0]?.position, 1)
    assert.strictEqual(listings[0]?.renderedAt, null)
    assert.strictEqual(listings[0]?.updatedAt, '2025-04-01 00:00:00')

    assert.strictEqual(listings[1]?.id, 4)
    assert.strictEqual(listings[1]?.title, 'Next Spring First')
    assert.strictEqual(listings[1]?.startDate, '2026-04-15')
    assert.strictEqual(listings[1]?.endDate, '2026-04-22')
    assert.strictEqual(listings[1]?.seasonalYear, 2026)
    assert.strictEqual(listings[1]?.season, 1)
    assert.strictEqual(listings[1]?.position, 1)
    assert.strictEqual(listings[1]?.renderedAt, '2026-04-15 00:00:00')
    assert.strictEqual(listings[1]?.updatedAt, '2026-04-01 00:00:00')

    assert.strictEqual(listings[2]?.id, 3)
    assert.strictEqual(listings[2]?.title, 'Next Spring Second')
    assert.strictEqual(listings[2]?.position, 2)

    assert.strictEqual(listings[3]?.id, 1)
    assert.strictEqual(listings[3]?.title, 'Next Summer')
    assert.strictEqual(listings[3]?.position, 1)
  })
})
