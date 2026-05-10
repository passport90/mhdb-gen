import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderSeasonIndex', () => {
  /** Sentinel returned by the events repo, traced into the view-model builder's call args. */
  const sentinelEvents = [{ tag: 'sentinel-event' }]

  /** Sentinel view model returned by the view-model builder, traced into the page builder. */
  const sentinelViewModel = { tag: 'sentinel-view-model' }

  /** Sentinel HTML returned by the page builder, expected on disk. */
  const sentinelHtml = '<html>sentinel-season-index</html>'

  /** Mock for `findEventsInSeason`. */
  const findEventsInSeasonMock = mock.fn((): unknown[] => sentinelEvents)

  /** Mock for `buildSeasonIndexViewModel`. */
  const buildSeasonIndexViewModelMock = mock.fn((): unknown => sentinelViewModel)

  /** Mock for `buildSeasonIndexPage`. */
  const buildSeasonIndexPageMock = mock.fn(() => sentinelHtml)

  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so `findPrevSeasonWithEvents` can query it. */
  let db: DatabaseSync

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /**
   * Inserts an event row carrying just the columns this query path touches.
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

  /** SUT, dynamically imported once after the module mocks are registered. */
  let renderSeasonIndex: (db: DatabaseSync, outputDirPath: string, slot: SeasonalSlot) => void

  before(async () => {
    mock.module(
      '../../src/repositories/find-events-in-season.js',
      { defaultExport: findEventsInSeasonMock },
    )
    mock.module(
      '../../src/presenters/build-season-index-view-model.js',
      { defaultExport: buildSeasonIndexViewModelMock },
    )
    mock.module(
      '../../src/presenters/build-season-index-page.js',
      { defaultExport: buildSeasonIndexPageMock },
    )

    renderSeasonIndex = (await import('../../src/services/render-season-index.js')).default
  })

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    /** Path to the test SQLite file. */
    const dbPath = join(tmpDirPath, 'test.sqlite')
    outputDirPath = join(tmpDirPath, 'output')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    findEventsInSeasonMock.mock.resetCalls()
    buildSeasonIndexViewModelMock.mock.resetCalls()
    buildSeasonIndexPageMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('chains the events + prev/next-season repos and the presenter mocks, writing to the slot folder', () => {
    insertEventRow(1066, 0, 1, 'earlier-slot')
    insertEventRow(1066, 1, 1, 'subject-event')
    insertEventRow(1066, 2, 1, 'later-slot')

    /** Slot being rendered. */
    const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

    renderSeasonIndex(db, outputDirPath, slot)

    assert.deepStrictEqual(buildSeasonIndexViewModelMock.mock.calls[0]?.arguments, [
      slot,
      sentinelEvents,
      { seasonalYear: 1066, season: 0 },
      { seasonalYear: 1066, season: 2 },
    ])
    assert.deepStrictEqual(buildSeasonIndexPageMock.mock.calls[0]?.arguments, [sentinelViewModel])
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', '1', 'index.html'), 'utf8'),
      sentinelHtml,
    )
  })
})
