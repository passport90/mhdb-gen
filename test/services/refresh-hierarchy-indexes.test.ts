import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import refreshHierarchyIndexes from '../../src/services/refresh-hierarchy-indexes.js'
import { tmpdir } from 'node:os'

describe('refreshHierarchyIndexes', () => {
  /** Tmp directory holding the test SQLite file and output tree. */
  let tmpDirPath: string

  /** Database handle threaded into the SUT; on-disk SQLite so the real chain can query it. */
  let db: DatabaseSync

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /**
   * Inserts an event row carrying just the columns the index queries touch.
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

  it('renders the root index plus every touched year and slot index, deduping years across slots', () => {
    insertEventRow(1066, 3, 1, 'a')
    insertEventRow(2026, 1, 1, 'b')
    insertEventRow(2026, 2, 1, 'c')

    /** Two slots in 2026 each containing a freshly rendered event. */
    const slotsWithRenderedEvents: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
    ]

    /** One slot in 1066 whose orphan event output was pruned this run — orchestrator should refresh its indexes too. */
    const slotsWithPrunedEvents: SeasonalSlot[] = [
      { seasonalYear: 1066, season: 3 },
    ]

    refreshHierarchyIndexes(db, outputDirPath, slotsWithRenderedEvents, slotsWithPrunedEvents)

    assert.ok(existsSync(join(outputDirPath, 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '1066', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '1066', '3-fall', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', '1-spring', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', '2-summer', 'index.html')))
  })

  describe('when no seasons were rendered or pruned', () => {
    it('writes nothing — every child renderer is skipped', () => {
      refreshHierarchyIndexes(db, outputDirPath, [], [])

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
