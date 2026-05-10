import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderYearIndex', () => {
  /** Sentinel HTML returned by the page builder, expected on disk. */
  const sentinelHtml = '<html>sentinel-year-index</html>'

  /** Mock for `buildYearIndexPage`. */
  const buildYearIndexPageMock = mock.fn(() => sentinelHtml)

  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so `findSeasonsWithEventsInYear` can query it. */
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
  let renderYearIndex: (db: DatabaseSync, outputDirPath: string, year: number) => void

  before(async () => {
    mock.module(
      '../../src/presenters/build-year-index-page.js',
      { defaultExport: buildYearIndexPageMock },
    )

    renderYearIndex = (await import('../../src/services/render-year-index.js')).default
  })

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    /** Path to the test SQLite file. */
    const dbPath = join(tmpDirPath, 'test.sqlite')
    outputDirPath = join(tmpDirPath, 'output')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    buildYearIndexPageMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('chains the three repos and the page builder, writing to the year folder', () => {
    insertEventRow(1065, 1, 1, 'earlier')
    insertEventRow(1066, 1, 1, 'a')
    insertEventRow(1066, 3, 1, 'b')
    insertEventRow(1067, 1, 1, 'later')

    renderYearIndex(db, outputDirPath, 1066)

    assert.deepStrictEqual(buildYearIndexPageMock.mock.calls[0]?.arguments, [
      {
        year: 1066,
        seasonsWithEvents: [1, 3],
        prevYear: 1065,
        nextYear: 1067,
      },
    ])
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', 'index.html'), 'utf8'),
      sentinelHtml,
    )
  })
})
