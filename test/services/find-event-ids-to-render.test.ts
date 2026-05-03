import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventSlot from '../../src/types/event-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findEventIdsToRender from '../../src/services/find-event-ids-to-render.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventIdsToRender', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file and simulated output tree. */
  let tmpDir: string

  /** Output root passed to the SUT for its folder-presence check. */
  let outputDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle threaded into the SUT. */
  let db: DatabaseSync

  /**
   * Inserts a row into `events` at the given slot with the given slug. `renderedAt`
   * controls the SQL staleness arm: `null` makes the row stale by null-render; any
   * value strictly earlier than the row's default `updated_at` makes it stale by
   * `<`; a value far in the future makes it fresh.
   *
   * @param slot - Slot stored in the row's `(seasonal_year, season, position)` columns.
   * @param slug - Slug stored in the row.
   * @param renderedAt - Value for `rendered_at` (ISO timestamp or null).
   */
  const insertEventRow = (slot: EventSlot, slug: string, renderedAt: string | null): void => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, start_date, end_date,
        seasonal_year, season, position,
        rendered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      slug,
      'Title',
      'body',
      '2026-01-01',
      '2026-12-31',
      slot.seasonalYear,
      slot.season,
      slot.position,
      renderedAt,
    )
  }

  /**
   * Creates the on-disk output folder for the given event coordinate, simulating
   * an event whose render output is already on disk.
   *
   * @param seasonalYear - Seasonal year segment of the folder path.
   * @param season - Season segment of the folder path.
   * @param slug - Slug segment of the folder path.
   */
  const seedOutputFolder = (seasonalYear: number, season: number, slug: string): void => {
    mkdirSync(
      join(outputDir, String(seasonalYear), String(season), slug),
      { recursive: true },
    )
  }

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDir = join(tmpDir, 'output')
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns ids of candidates that are db-stale or whose output folder is missing, in candidate order', () => {
    insertEventRow({ seasonalYear: 2026, season: 0, position: 1 }, 'stale-with-folder', null)
    insertEventRow({ seasonalYear: 2026, season: 1, position: 1 }, 'stale-no-folder', null)
    insertEventRow({ seasonalYear: 2026, season: 2, position: 1 }, 'fresh-with-folder', '2099-01-01 00:00:00')
    insertEventRow({ seasonalYear: 2026, season: 3, position: 1 }, 'fresh-no-folder', '2099-01-01 00:00:00')

    seedOutputFolder(2026, 0, 'stale-with-folder')
    seedOutputFolder(2026, 2, 'fresh-with-folder')

    /** Ids returned by the SUT. */
    const ids = findEventIdsToRender(db, outputDir)

    assert.deepStrictEqual(ids, [1, 2, 4])
  })
})
