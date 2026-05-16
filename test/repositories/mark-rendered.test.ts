import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import markRendered from '../../src/repositories/mark-rendered.js'
import { tmpdir } from 'node:os'

describe('markRendered', () => {
  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the seed insert and the SUT call. */
  let db: DatabaseSync

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('stamps rendered_at on the row at the given id, leaving updated_at untouched', () => {
    db.prepare(`
      INSERT INTO events (
        title, description, start_date, end_date,
        seasonal_year, season, position,
        updated_at, rendered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Title',
      'body',
      '2026-01-01',
      '2026-12-31',
      2026,
      1,
      1,
      '2020-01-01 00:00:00',
      null,
    )

    markRendered(db, 1)

    /** Row state after the SUT call. */
    const row = db.prepare('SELECT rendered_at, updated_at FROM events WHERE id = ?').get(1)

    assert.ok(row !== undefined)
    assert.notStrictEqual(row.rendered_at, null)
    assert.strictEqual(row.updated_at, '2020-01-01 00:00:00')
  })
})
