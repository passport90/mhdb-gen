import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderYearIndex', () => {
  /** Sentinel returned by the seasons repo, traced into the page builder's call args. */
  const sentinelSeasonsWithEvents = [1, 3]

  /** Sentinel returned by the prev-year repo. */
  const sentinelPrevYear = 1065

  /** Sentinel returned by the next-year repo. */
  const sentinelNextYear = 1067

  /** Sentinel HTML returned by the page builder, expected on disk. */
  const sentinelHtml = '<html>sentinel-year-index</html>'

  /** Mock for `findSeasonsWithEventsInYear`. */
  const findSeasonsWithEventsInYearMock = mock.fn(() => sentinelSeasonsWithEvents)

  /** Mock for `findPrevYearWithEvents`. */
  const findPrevYearWithEventsMock = mock.fn((): number | null => sentinelPrevYear)

  /** Mock for `findNextYearWithEvents`. */
  const findNextYearWithEventsMock = mock.fn((): number | null => sentinelNextYear)

  /** Mock for `buildYearIndexPage`. */
  const buildYearIndexPageMock = mock.fn(() => sentinelHtml)

  /** Sentinel database handle threaded into the SUT. */
  let db: DatabaseSync

  /** Tmp directory holding the output tree. */
  let tmpDirPath: string

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /** SUT, dynamically imported once after the module mocks are registered. */
  let renderYearIndex: (db: DatabaseSync, outputDirPath: string, year: number) => void

  before(async () => {
    mock.module(
      '../../src/repositories/find-seasons-with-events-in-year.js',
      { defaultExport: findSeasonsWithEventsInYearMock },
    )
    mock.module(
      '../../src/repositories/find-prev-year-with-events.js',
      { defaultExport: findPrevYearWithEventsMock },
    )
    mock.module(
      '../../src/repositories/find-next-year-with-events.js',
      { defaultExport: findNextYearWithEventsMock },
    )
    mock.module(
      '../../src/presenters/build-year-index-page.js',
      { defaultExport: buildYearIndexPageMock },
    )

    renderYearIndex = (await import('../../src/services/render-year-index.js')).default
  })

  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')

    findSeasonsWithEventsInYearMock.mock.resetCalls()
    findPrevYearWithEventsMock.mock.resetCalls()
    findNextYearWithEventsMock.mock.resetCalls()
    buildYearIndexPageMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('chains the three repos and the page builder, writing to <outputDirPath>/<year>/index.html', () => {
    renderYearIndex(db, outputDirPath, 1066)

    assert.deepStrictEqual(findSeasonsWithEventsInYearMock.mock.calls[0]?.arguments, [db, 1066])
    assert.deepStrictEqual(findPrevYearWithEventsMock.mock.calls[0]?.arguments, [db, 1066])
    assert.deepStrictEqual(findNextYearWithEventsMock.mock.calls[0]?.arguments, [db, 1066])
    assert.deepStrictEqual(buildYearIndexPageMock.mock.calls[0]?.arguments, [
      {
        year: 1066,
        seasonsWithEvents: sentinelSeasonsWithEvents,
        prevYear: sentinelPrevYear,
        nextYear: sentinelNextYear,
      },
    ])
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', 'index.html'), 'utf8'),
      sentinelHtml,
    )
  })
})
