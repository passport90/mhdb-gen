import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventSlot from '../../src/types/event-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import isSlugConflicting from '../../src/repositories/is-slug-conflicting.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('isSlugConflicting', () => {
  /** Slot passed as the "self" exclusion to `isSlugConflicting`. */
  const subjectSlot: EventSlot = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
  }

  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the SUT call and any seed inserts in each test. */
  let db: DatabaseSync

  /**
   * Inserts a row into `events` holding the given slug at the given slot. Other
   * columns are populated with placeholders that satisfy the table's `CHECK`
   * constraints.
   *
   * @param slug - Slug stored in the row.
   * @param slot - Slot stored in the row's `(seasonal_year, season, position)` columns.
   */
  const insertEventRow = (slug: string, slot: EventSlot): void => {
    db.prepare(`
      INSERT INTO events (slug, title, description, start_date, end_date, seasonal_year, season, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(slug, 'Title', 'body', '2026-01-01', '2026-12-31', slot.seasonalYear, slot.season, slot.position)
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

  it('returns true when another row holds the slug', () => {
    insertEventRow('hello-world', { seasonalYear: 2025, season: 0, position: 1 })

    assert.strictEqual(isSlugConflicting(db, 'hello-world', subjectSlot), true)
  })

  describe('when no row holds the slug', () => {
    it('returns false', () => {
      assert.strictEqual(isSlugConflicting(db, 'hello-world', subjectSlot), false)
    })
  })

  describe('when only the subject slot itself holds the slug', () => {
    it('returns false — the slot is excluded from the conflict check', () => {
      insertEventRow('hello-world', subjectSlot)

      assert.strictEqual(isSlugConflicting(db, 'hello-world', subjectSlot), false)
    })
  })
})
