import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderSeasonIndex', () => {
  /** Sentinel returned by the events repo, traced into the view-model builder's call args. */
  const sentinelEvents = [{ tag: 'sentinel-event' }]

  /** Sentinel returned by the prev-season repo. */
  const sentinelPrevSlot: SeasonalSlot = { seasonalYear: 1066, season: 0 }

  /** Sentinel returned by the next-season repo. */
  const sentinelNextSlot: SeasonalSlot = { seasonalYear: 1066, season: 2 }

  /** Sentinel view model returned by the view-model builder, traced into the page builder. */
  const sentinelViewModel = { tag: 'sentinel-view-model' }

  /** Sentinel HTML returned by the page builder, expected on disk. */
  const sentinelHtml = '<html>sentinel-season-index</html>'

  /** Mock for `findEventsInSeason`. */
  const findEventsInSeasonMock = mock.fn((): unknown[] => sentinelEvents)

  /** Mock for `findPrevSeasonWithEvents`. */
  const findPrevSeasonWithEventsMock = mock.fn((): SeasonalSlot | null => sentinelPrevSlot)

  /** Mock for `findNextSeasonWithEvents`. */
  const findNextSeasonWithEventsMock = mock.fn((): SeasonalSlot | null => sentinelNextSlot)

  /** Mock for `buildSeasonIndexViewModel`. */
  const buildSeasonIndexViewModelMock = mock.fn((): unknown => sentinelViewModel)

  /** Mock for `buildSeasonIndexPage`. */
  const buildSeasonIndexPageMock = mock.fn(() => sentinelHtml)

  /** Sentinel database handle threaded into the SUT. */
  let db: DatabaseSync

  /** Tmp directory holding the output tree. */
  let tmpDirPath: string

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /** SUT, dynamically imported once after the module mocks are registered. */
  let renderSeasonIndex: (db: DatabaseSync, outputDirPath: string, slot: SeasonalSlot) => void

  before(async () => {
    mock.module(
      '../../src/repositories/find-events-in-season.js',
      { defaultExport: findEventsInSeasonMock },
    )
    mock.module(
      '../../src/repositories/find-prev-season-with-events.js',
      { defaultExport: findPrevSeasonWithEventsMock },
    )
    mock.module(
      '../../src/repositories/find-next-season-with-events.js',
      { defaultExport: findNextSeasonWithEventsMock },
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
    db = new DatabaseSync(':memory:')
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')

    findEventsInSeasonMock.mock.resetCalls()
    findPrevSeasonWithEventsMock.mock.resetCalls()
    findNextSeasonWithEventsMock.mock.resetCalls()
    buildSeasonIndexViewModelMock.mock.resetCalls()
    buildSeasonIndexPageMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('chains the three repos and the two presenters, writing to <outputDirPath>/<year>/<season>/index.html', () => {
    /** Slot being rendered. */
    const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

    renderSeasonIndex(db, outputDirPath, slot)

    assert.deepStrictEqual(findEventsInSeasonMock.mock.calls[0]?.arguments, [db, 1066, 1])
    assert.deepStrictEqual(findPrevSeasonWithEventsMock.mock.calls[0]?.arguments, [db, 1066, 1])
    assert.deepStrictEqual(findNextSeasonWithEventsMock.mock.calls[0]?.arguments, [db, 1066, 1])
    assert.deepStrictEqual(buildSeasonIndexViewModelMock.mock.calls[0]?.arguments, [
      slot,
      sentinelEvents,
      sentinelPrevSlot,
      sentinelNextSlot,
    ])
    assert.deepStrictEqual(buildSeasonIndexPageMock.mock.calls[0]?.arguments, [sentinelViewModel])
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', '1', 'index.html'), 'utf8'),
      sentinelHtml,
    )
  })
})
