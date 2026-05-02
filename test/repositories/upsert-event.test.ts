import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import type EventSlot from '../../src/types/event-slot.js'
import type ParsedEvent from '../../src/types/parsed-event.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import upsertEvent from '../../src/repositories/upsert-event.js'

describe('upsertEvent', () => {
  /** Parsed event written by the upsert call under test. */
  const subjectEvent: ParsedEvent = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    title: 'Hello World',
    description: '\nbody\n',
  }

  /** Slug paired with `subjectEvent` for the upsert call under test. */
  const subjectSlug = 'hello-world'

  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /**
   * Inserts a row directly into `events` at the given slot, bypassing the SUT.
   * Used to seed a slot before exercising `upsertEvent`'s update branch.
   *
   * @param slug - Slug stored in the seeded row.
   * @param slot - Slot stored in the seeded row's `(seasonal_year, season, position)` columns.
   * @returns Surrogate id of the seeded row.
   */
  const seedEventRow = (slug: string, slot: EventSlot): number => {
    /** Database handle for this insert; closed before return. */
    const db = new DatabaseSync(dbPath)

    /** Result of the INSERT, exposing the autoincremented `lastInsertRowid`. */
    const result = db.prepare(`
      INSERT INTO events (slug, title, description, start_date, end_date, seasonal_year, season, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(slug, 'Title', 'body', '2026-01-01', '2026-12-31', slot.seasonalYear, slot.season, slot.position)

    db.close()

    return Number(result.lastInsertRowid)
  }

  /**
   * Reads the row from `events`, or `null` when the table is empty.
   *
   * @returns Row as a plain object keyed by column name, or `null` when no row exists.
   */
  const readEventRow = (): Record<string, SQLOutputValue> | null => {
    /** Database handle for this read; closed before return. */
    const db = new DatabaseSync(dbPath)

    /** Rows currently in the `events` table. */
    const rows = db.prepare('SELECT * FROM events').all()

    db.close()

    if (rows.length === 0) {
      return null
    }

    return rows[0]
  }

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('inserts a new row when the slot is unoccupied', () => {
    upsertEvent(subjectEvent, subjectSlug)

    /** Row written by the upsert call. */
    const row = readEventRow()

    assert.ok(row !== null)
    assert.strictEqual(row.slug, 'hello-world')
    assert.strictEqual(row.title, 'Hello World')
    assert.strictEqual(row.description, '\nbody\n')
    assert.strictEqual(row.start_date, '2026-04-15')
    assert.strictEqual(row.end_date, '2026-04-22')
    assert.strictEqual(row.seasonal_year, 2026)
    assert.strictEqual(row.season, 1)
    assert.strictEqual(row.position, 3)
  })

  describe('when a row already occupies the slot', () => {
    it('updates the existing row in place, preserving the surrogate id', () => {
      /** Surrogate id of the row seeded into the subject slot. */
      const idBeforeUpdate = seedEventRow('placeholder-slug', { seasonalYear: 2026, season: 1, position: 3 })

      upsertEvent(subjectEvent, subjectSlug)

      /** Row state after the upsert. */
      const row = readEventRow()

      assert.ok(row !== null)
      assert.strictEqual(row.id, idBeforeUpdate)
      assert.strictEqual(row.slug, 'hello-world')
      assert.strictEqual(row.title, 'Hello World')
      assert.strictEqual(row.description, '\nbody\n')
      assert.strictEqual(row.start_date, '2026-04-15')
      assert.strictEqual(row.end_date, '2026-04-22')
    })
  })
})
