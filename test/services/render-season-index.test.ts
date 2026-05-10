import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type SeasonIndexPageViewModel from '../../src/types/season-index-page-view-model.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderSeasonIndex', () => {
  /** Sentinel HTML returned by the page builder, expected on disk. */
  const sentinelHtml = '<html>sentinel-season-index</html>'

  /** Mock for `buildSeasonIndexPage`. */
  const buildSeasonIndexPageMock = mock.fn((_viewModel: SeasonIndexPageViewModel) => sentinelHtml)

  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so `findPrevSeasonWithEvents` can query it. */
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

  /** SUT, dynamically imported once after the module mocks are registered. */
  let renderSeasonIndex: (db: DatabaseSync, outputDirPath: string, slot: SeasonalSlot) => void

  before(async () => {
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

    buildSeasonIndexPageMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('writes the rendered page to the slot folder, threading the slot events and prev/next adjacencies', () => {
    insertEventRow(1066, 0, 1, 'earlier-slot', 'Earlier', '1066-01-01', '1066-01-02')
    insertEventRow(1066, 1, 1, 'first-event', 'First Event', '1066-04-15', '1066-04-22')
    insertEventRow(1066, 1, 2, 'second-event', 'Second Event', '1066-04-23', '1066-04-30')
    insertEventRow(1066, 2, 1, 'later-slot', 'Later', '1066-07-01', '1066-07-02')

    /** Slot being rendered. */
    const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

    renderSeasonIndex(db, outputDirPath, slot)

    /** View model that real `buildSeasonIndexViewModel` produced and `buildSeasonIndexPage` was called with. */
    const renderedViewModel = buildSeasonIndexPageMock.mock.calls[0]?.arguments[0]
    assert.ok(renderedViewModel !== undefined)
    assert.strictEqual(renderedViewModel.seasonLabel, 'Spring 1066')
    assert.strictEqual(renderedViewModel.timelineEntries.length, 2)
    assert.strictEqual(renderedViewModel.timelineEntries[0]?.eventPagePath, '1066/1/first-event/index.html')
    assert.strictEqual(renderedViewModel.timelineEntries[1]?.eventPagePath, '1066/1/second-event/index.html')
    assert.deepStrictEqual(renderedViewModel.prevSeasonLink, {
      label: 'Winter 1066',
      indexPagePath: '1066/0/index.html',
    })
    assert.deepStrictEqual(renderedViewModel.nextSeasonLink, {
      label: 'Summer 1066',
      indexPagePath: '1066/2/index.html',
    })
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', '1', 'index.html'), 'utf8'),
      sentinelHtml,
    )
  })
})
