import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventSlot from '../../src/types/event-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findAllEventHeaders from '../../src/repositories/find-all-event-headers.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findAllEventHeaders', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the seed inserts and the SUT call. */
  let db: DatabaseSync

  /**
   * Inserts a row into `events` at the given slot with controlled timestamp columns,
   * bypassing the `updated_at` trigger so the headers' raw timestamps land
   * deterministically.
   *
   * @param slot - Slot stored in the row's `(seasonal_year, season, position)` columns.
   * @param slug - Slug stored in the row.
   * @param renderedAt - Value for `rendered_at`; `null` is the never-rendered arm.
   * @param updatedAt - Value for `updated_at`.
   */
  const insertEventRow = (
    slot: EventSlot,
    slug: string,
    renderedAt: string | null,
    updatedAt: string,
  ): void => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, start_date, end_date,
        seasonal_year, season, position,
        updated_at, rendered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      slug,
      'Title',
      'body',
      '2026-01-01',
      '2026-12-31',
      slot.seasonalYear,
      slot.season,
      slot.position,
      updatedAt,
      renderedAt,
    )
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

  it('returns each event header with raw timestamps, ordered by (seasonal_year, season, position)', () => {
    insertEventRow(
      { seasonalYear: 2026, season: 2, position: 1 },
      'next-summer',
      '2026-06-01 00:00:00',
      '2026-05-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2025, season: 1, position: 1 },
      'last-spring',
      null,
      '2025-04-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2026, season: 1, position: 2 },
      'next-spring-second',
      '2026-04-15 00:00:00',
      '2026-04-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2026, season: 1, position: 1 },
      'next-spring-first',
      '2026-04-15 00:00:00',
      '2026-04-01 00:00:00',
    )

    /** Headers returned by the SUT. */
    const headers = findAllEventHeaders(db)

    assert.strictEqual(headers.length, 4)

    assert.strictEqual(headers[0]?.id, 2)
    assert.strictEqual(headers[0]?.slug, 'last-spring')
    assert.strictEqual(headers[0]?.seasonalYear, 2025)
    assert.strictEqual(headers[0]?.season, 1)
    assert.strictEqual(headers[0]?.renderedAt, null)
    assert.strictEqual(headers[0]?.updatedAt, '2025-04-01 00:00:00')

    assert.strictEqual(headers[1]?.id, 4)
    assert.strictEqual(headers[1]?.slug, 'next-spring-first')
    assert.strictEqual(headers[1]?.seasonalYear, 2026)
    assert.strictEqual(headers[1]?.season, 1)
    assert.strictEqual(headers[1]?.renderedAt, '2026-04-15 00:00:00')
    assert.strictEqual(headers[1]?.updatedAt, '2026-04-01 00:00:00')

    assert.strictEqual(headers[2]?.id, 3)
    assert.strictEqual(headers[2]?.slug, 'next-spring-second')

    assert.strictEqual(headers[3]?.id, 1)
    assert.strictEqual(headers[3]?.slug, 'next-summer')
  })
})
