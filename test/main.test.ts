import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import { SUCCESS_EXIT_CODE, USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { PassThrough } from 'node:stream'
import applyMigrations from './support/apply-migrations.js'
import assert from 'node:assert/strict'
import type groupUpsertArgs from '../src/services/group-upsert-args.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/** Mock for `groupUpsertArgs`; configured in the dispatch test to return one source for the upserted file. */
const mockGroupUpsertArgs = mock.fn<typeof groupUpsertArgs>()

mock.module('../src/services/group-upsert-args.js', {
  defaultExport: mockGroupUpsertArgs,
})

/** Program entry point, dynamically imported after the `groupUpsertArgs` mock is installed. */
const main = (await import('../src/main.js')).default

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
  let tmpDir: string

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
      SELECT slug, title, description, start_date, end_date,
        seasonal_year, season, position
      FROM events
      ORDER BY position ASC
    `).all()

    db.close()

    return events
  }

  beforeEach(() => {
    mockGroupUpsertArgs.mock.resetCalls()
    mockGroupUpsertArgs.mock.mockImplementation(() => {
      throw new Error('mockGroupUpsertArgs not configured for this test')
    })

    messageStream = new PassThrough()
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('dispatches the command to its controller', () => {
    /** Tmp path the upsert controller is invoked against. */
    const filePath = join(tmpDir, 'a.md')

    writeFileSync(filePath, fixtureContent)

    mockGroupUpsertArgs.mock.mockImplementation(() => [{
      entryFilePath: filePath,
      illustrationFilePath: null,
    }])

    /** Exit code returned by `main`. */
    const code = main(['upsert', filePath], messageStream)

    /** Event rows persisted by the upsert run. */
    const events = readEvents()

    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].slug, 'event')
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
