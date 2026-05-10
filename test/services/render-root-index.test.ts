import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderRootIndex from '../../src/services/render-root-index.js'
import { tmpdir } from 'node:os'

describe('renderRootIndex', () => {
  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so the real chain can query it. */
  let db: DatabaseSync

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /**
   * Inserts an event row carrying just the columns the root-index query path touches.
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

  it('writes the root index to <outputDirPath>/index.html, with year cells reflecting DB state', () => {
    insertEventRow(1066, 3, 1, 'a')
    insertEventRow(2026, 1, 1, 'b')

    renderRootIndex(db, outputDirPath)

    /** Rendered root index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>MHDB</title>'))
    assert.ok(indexHtml.includes('<th scope="row">1060s</th>'))
    assert.ok(indexHtml.includes('<a href="1066/index.html">1066</a>'))
    assert.ok(indexHtml.includes('<th scope="row">2020s</th>'))
    assert.ok(indexHtml.includes('<a href="2026/index.html">2026</a>'))
  })
})
