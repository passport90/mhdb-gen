import { SUCCESS_EXIT_CODE, USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { PassThrough } from 'node:stream'
import applyMigrations from './support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import main from '../src/main.js'
import { tmpdir } from 'node:os'

describe('main', () => {
  /** Markdown fixture content written into the tmp file; passes real `parseEventFileContent` end-to-end. */
  const fixtureContent = `---
{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}
---

# Event

body
`

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  /** Tmp directory created fresh per test; holds the real markdown fixture and the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /**
   * Reads the row count of the `events` table in the test SQLite file.
   *
   * @returns Number of rows currently in `events`.
   */
  const readEventRowCount = (): number => {
    /** Database handle for this read; closed before return. */
    const db = new DatabaseSync(dbPath)

    /** Row count returned by the count query. */
    const count = (db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number }).count

    db.close()

    return count
  }

  beforeEach(async () => {
    messageStream = new PassThrough()
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    await applyMigrations(dbPath)
  })

  afterEach(async () => {
    delete process.env.MHDB_DB_PATH
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('dispatches the command to its controller', async () => {
    /** Tmp path the upsert controller is invoked against. */
    const filePath = join(tmpDir, 'a.md')

    await writeFile(filePath, fixtureContent)

    /** Exit code returned by `main`. */
    const code = await main(['upsert', filePath], messageStream)

    assert.strictEqual(readEventRowCount(), 1)
    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })

  describe('when no command is given', () => {
    it('prints usage and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main([], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /^usage: /)
      assert.strictEqual(readEventRowCount(), 0)
    })
  })

  describe('when the command is unknown', () => {
    it('writes the UsageError message and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main(['nope'], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /unknown command: 'nope'/)
      assert.strictEqual(readEventRowCount(), 0)
    })
  })
})
