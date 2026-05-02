import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
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

  /** Tmp directory created fresh per test; holds the real markdown fixture and the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

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

  it('reads the file, parses it, derives a slug, and upserts the composed event', async () => {
    /** Path to the real markdown fixture written for this test. */
    const filePath = join(tmpDir, 'event.md')

    await writeFile(filePath, fixtureContent)

    await processEventFile(filePath)

    /** Database handle for reading the inserted row. */
    const db = new DatabaseSync(dbPath)

    /** Rows currently in the `events` table. */
    const rows = db.prepare('SELECT * FROM events').all()

    db.close()

    assert.strictEqual(rows.length, 1)

    /** Sole row written by the pipeline. */
    const row = rows[0] as Record<string, unknown>

    assert.strictEqual(row.slug, 'my-event')
    assert.strictEqual(row.title, 'My Event')
    assert.strictEqual(row.description, '\ndescription body\n')
    assert.strictEqual(row.start_date, '2026-04-15')
    assert.strictEqual(row.end_date, '2026-04-22')
    assert.strictEqual(row.seasonal_year, 2026)
    assert.strictEqual(row.season, 1)
    assert.strictEqual(row.position, 3)
  })

  describe('when an error occurs anywhere in the pipeline', () => {
    it('wraps the cause in an EventFileError carrying the path', async () => {
      /** Non-existent path; `readFile` will reject with `ENOENT`. */
      const missingPath = join(tmpDir, 'missing.md')

      await assert.rejects(
        processEventFile(missingPath),
        (err: unknown) => err instanceof EventFileError && err.path === missingPath,
      )
    })
  })
})
