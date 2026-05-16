import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderYearIndex from '../../src/services/render-year-index.js'
import { tmpdir } from 'node:os'

describe('renderYearIndex', () => {
  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so the real chain can query it. */
  let db: DatabaseSync

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /**
   * Inserts an event row carrying just the columns this query path touches.
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

  it('writes the year index page to <outputDirPath>/<year>/index.html with seasons + nav reflecting DB state', () => {
    insertEventRow(1065, 1, 1)
    insertEventRow(1066, 1, 1)
    insertEventRow(1066, 3, 1)
    insertEventRow(1067, 1, 1)

    renderYearIndex(db, outputDirPath, 1066)

    /** Rendered year index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, '1066', 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>Seasons 1066 - MHDB</title>'))
    assert.ok(indexHtml.includes('<a class="season-card" data-season="1" href="1066/1-spring/index.html">'))
    assert.ok(indexHtml.includes('<a class="season-card" data-season="3" href="1066/3-fall/index.html">'))
    assert.ok(indexHtml.includes('<span class="season-card season-card-empty" data-season="0">'))
    assert.ok(indexHtml.includes('<span class="season-card season-card-empty" data-season="2">'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1065/index.html">← 1065</a>'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1067/index.html">1067 →</a>'))
  })

  describe('when the year has no events in the DB', () => {
    it('writes nothing — leaves the output tree as the upstream prune left it', () => {
      renderYearIndex(db, outputDirPath, 1066)

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
