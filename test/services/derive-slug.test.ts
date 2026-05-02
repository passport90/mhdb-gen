import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import type ParsedEvent from '../../src/types/parsed-event.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import deriveSlug from '../../src/services/derive-slug.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('deriveSlug', () => {
  /** Parsed event the slug is derived for. */
  const subjectEvent: ParsedEvent = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    title: 'Hello World',
    description: '\nbody\n',
  }

  /** Slug the real `slugify` produces for `subjectEvent.title`; the dedup loop builds suffixes off this. */
  const baseSlug = 'hello-world'

  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /**
   * Inserts a row into `events` holding the given slug at a slot disjoint from `subjectEvent`.
   *
   * @param slug - Slug stored in the row.
   * @param position - `position` value for the conflicting slot; year and season are fixed at `(2025, 0)`.
   */
  const insertConflictingRow = (slug: string, position: number): void => {
    /** Database handle for this insert; closed before return. */
    const db = new DatabaseSync(dbPath)

    db.prepare(`
      INSERT INTO events (slug, title, description, start_date, end_date, seasonal_year, season, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(slug, 'Title', 'body', '2025-01-01', '2025-12-31', 2025, 0, position)

    db.close()
  }

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    await applyMigrations(dbPath)
  })

  afterEach(async () => {
    delete process.env.MHDB_DB_PATH
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('slugifies the title and returns the base slug when no row conflicts', () => {
    assert.strictEqual(deriveSlug(subjectEvent), baseSlug)
  })

  describe('when the base slug conflicts with another row', () => {
    it('appends -2 and returns the first free suffix', () => {
      insertConflictingRow('hello-world', 1)

      assert.strictEqual(deriveSlug(subjectEvent), 'hello-world-2')
    })
  })

  describe('when the base slug and -2 both conflict with other rows', () => {
    it('walks the counter to -3', () => {
      insertConflictingRow('hello-world', 1)
      insertConflictingRow('hello-world-2', 2)

      assert.strictEqual(deriveSlug(subjectEvent), 'hello-world-3')
    })
  })
})
