import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import EventFileError from '../../src/errors/event-file-error.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import processEventFile from '../../src/services/process-event-file.js'
import { tmpdir } from 'node:os'

describe('processEventFile', () => {
  /** Markdown fixture content written into the tmp file under test. */
  const fixtureContent = `---
{
  "seasonalYear": 2026,
  "season": 1,
  "position": 3,
  "startDate": "2026-04-15",
  "endDate": "2026-04-22"
}
---

# My Event

description body
`

  /** Tmp directory created fresh per test; holds the markdown fixture and the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle reused across the SUT call and any reads in each test. */
  let db: DatabaseSync

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

  it('upserts the event, hashes the illustration onto the row, and copies the bytes into the blob store', () => {
    /** Path to the markdown fixture written for this test. */
    const filePath = join(tmpDirPath, 'event.md')

    /** Path to the illustration fixture written for this test. */
    const illustrationPath = join(tmpDirPath, 'event.png')

    writeFileSync(filePath, fixtureContent)
    writeFileSync(illustrationPath, 'hello world')

    processEventFile(db, filePath, illustrationPath)

    /** Rows currently in the `events` table. */
    const rows = db.prepare('SELECT * FROM events').all()

    assert.strictEqual(rows.length, 1)

    /** Sole row written by the pipeline. */
    const row = rows[0] as Record<string, unknown>

    assert.strictEqual(row.title, 'My Event')
    assert.strictEqual(row.description, '\ndescription body\n')
    assert.strictEqual(
      row.illustration_hash,
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    )
    assert.strictEqual(row.start_date, '2026-04-15')
    assert.strictEqual(row.end_date, '2026-04-22')
    assert.strictEqual(row.seasonal_year, 2026)
    assert.strictEqual(row.season, 1)
    assert.strictEqual(row.position, 3)
    assert.strictEqual(
      readFileSync(`${dbPath}.blobs/2026-1-3-my-event.png`, 'utf8'),
      'hello world',
    )
  })

  describe('when no illustration path is given', () => {
    it('upserts the event with a null illustration hash and writes no blob', () => {
      /** Path to the markdown fixture written for this test. */
      const filePath = join(tmpDirPath, 'event.md')

      writeFileSync(filePath, fixtureContent)

      processEventFile(db, filePath, null)

      /** Sole row written by the pipeline. */
      const row = db.prepare('SELECT * FROM events').get() as Record<string, unknown>

      assert.strictEqual(row.illustration_hash, null)
      assert.strictEqual(existsSync(`${dbPath}.blobs/2026-1-3-my-event.png`), false)
    })
  })

  describe('when an error occurs anywhere in the pipeline', () => {
    it('wraps the cause in an EventFileError carrying the path', () => {
      /** Non-existent path; `readFileSync` will throw `ENOENT`. */
      const missingPath = join(tmpDirPath, 'missing.md')

      assert.throws(
        () => processEventFile(db, missingPath, null),
        (err: unknown) => err instanceof EventFileError && err.path === missingPath,
      )
    })
  })
})
