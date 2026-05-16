import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import { SUCCESS_EXIT_CODE, USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { PassThrough } from 'node:stream'
import applyMigrations from './support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import main from '../src/main.js'
import { tmpdir } from 'node:os'

describe('main', () => {
  /** Markdown fixture content written into the tmp file; valid input for the full upsert pipeline. */
  const fixtureContent = `---
{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}
---

# Event

body
`

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  /** Tmp directory created fresh per test; holds the markdown fixture and the test SQLite file. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /**
   * Reads every event row from the test SQLite file, projecting only the user-controllable
   * columns and ordering by `position` for stable assertions.
   *
   * @returns Event rows ordered by `position` ascending.
   */
  const readEvents = (): Record<string, SQLOutputValue>[] => {
    /** Database handle for this read; closed before return. */
    const db = new DatabaseSync(dbPath)

    /** Event rows ordered by position. */
    const events = db.prepare(`
      SELECT title, description, start_date, end_date,
        seasonal_year, season, position
      FROM events
      ORDER BY position ASC
    `).all()

    db.close()

    return events
  }

  beforeEach(() => {
    messageStream = new PassThrough()
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('dispatches the command to its controller', () => {
    /** Tmp path the upsert controller is invoked against. */
    const filePath = join(tmpDirPath, 'a.md')

    writeFileSync(filePath, fixtureContent)

    /** Exit code returned by `main`. */
    const code = main(['upsert', filePath], messageStream)

    /** Event rows persisted by the upsert run. */
    const events = readEvents()

    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].title, 'Event')
    assert.strictEqual(events[0].description, '\nbody\n')
    assert.strictEqual(events[0].start_date, '2026-04-15')
    assert.strictEqual(events[0].end_date, '2026-04-22')
    assert.strictEqual(events[0].seasonal_year, 2026)
    assert.strictEqual(events[0].season, 1)
    assert.strictEqual(events[0].position, 3)
    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })

  describe('when no command is given', () => {
    it('prints usage and returns 1', () => {
      /** Exit code returned by `main`. */
      const code = main([], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /^usage: /)
      assert.strictEqual(readEvents().length, 0)
    })
  })

  describe('when the command is unknown', () => {
    it('writes the UsageError message and returns 1', () => {
      /** Exit code returned by `main`. */
      const code = main(['nope'], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /unknown command: 'nope'/)
      assert.strictEqual(readEvents().length, 0)
    })
  })
})
