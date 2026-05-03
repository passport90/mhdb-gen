import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventRenderCandidate from '../../src/types/event-render-candidate.js'
import type EventSlot from '../../src/types/event-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import findEventRenderCandidates from '../../src/repositories/find-event-render-candidates.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventRenderCandidates', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the seed inserts and the SUT call. */
  let db: DatabaseSync

  /**
   * Inserts a row into `events` at the given slot with controlled timestamp columns,
   * bypassing the `updated_at` trigger so the staleness flag can be exercised
   * deterministically.
   *
   * @param slot - Slot stored in the row's `(seasonal_year, season, position)` columns.
   * @param slug - Slug stored in the row.
   * @param renderedAt - Value for `rendered_at`; `null` exercises the null-render arm of the staleness predicate.
   * @param updatedAt - Value for `updated_at`; combined with `renderedAt` to control the `<` arm.
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
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns each event with isDbStale, ordered by (seasonal_year, season, position)', () => {
    insertEventRow(
      { seasonalYear: 2026, season: 2, position: 1 },
      'fresh-event',
      '2026-06-01 00:00:00',
      '2026-05-01 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2026, season: 1, position: 2 },
      'stale-render',
      '2026-04-01 00:00:00',
      '2026-04-15 00:00:00',
    )
    insertEventRow(
      { seasonalYear: 2026, season: 1, position: 1 },
      'never-rendered',
      null,
      '2026-04-01 00:00:00',
    )

    /** Candidates returned by the SUT. */
    const candidates = findEventRenderCandidates(db)

    /** Expected candidates — three rows in (year, season, position) order with the SQL-computed staleness flag. */
    const expectedCandidates: EventRenderCandidate[] = [
      { id: 3, slug: 'never-rendered', seasonalYear: 2026, season: 1, isDbStale: true },
      { id: 2, slug: 'stale-render', seasonalYear: 2026, season: 1, isDbStale: true },
      { id: 1, slug: 'fresh-event', seasonalYear: 2026, season: 2, isDbStale: false },
    ]

    assert.deepStrictEqual(candidates, expectedCandidates)
  })
})
