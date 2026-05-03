import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import { OPERATIONAL_ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { PassThrough } from 'node:stream'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import upsert from '../../src/controllers/upsert.js'
import { writeFile } from 'node:fs/promises'

describe('upsert', () => {
  /**
   * Builds markdown fixture content for a fresh slot — the controller test
   * writes one file per slot so they can all upsert without colliding.
   *
   * @param position - `position` value for the event's slot.
   * @returns Markdown source with a JSON frontmatter pinned to `position`.
   */
  const buildFixtureContent = (position: number): string => `---
{"seasonalYear":2026,"season":1,"position":${position},"startDate":"2026-04-15","endDate":"2026-04-22"}
---

# Event ${position}

body
`

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  /** Tmp directory created fresh per test; holds the markdown fixtures and the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Tmp paths the controller is invoked against, written fresh per test. */
  let filePaths: string[]

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
      SELECT slug, title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      FROM events
      ORDER BY position ASC
    `).all()

    db.close()

    return events
  }

  beforeEach(async () => {
    messageStream = new PassThrough()
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
    filePaths = ['a.md', 'b.md', 'c.md'].map(name => join(tmpDir, name))
    await Promise.all(filePaths.map((path, index) => writeFile(path, buildFixtureContent(index + 1))))
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('pairs each `.md` with its sibling `.png` and writes one progress line per event', () => {
    /** Illustration paths pinned to each markdown fixture by basename. */
    const illustrationPaths = filePaths.map(path => path.replace(/\.md$/, '.png'))

    for (const [index, illustrationPath] of illustrationPaths.entries()) {
      writeFileSync(illustrationPath, `illustration-${index + 1}`)
    }

    /** Mixed argv: all markdown paths followed by all illustration paths, paired by basename across argv distance. */
    const mixedArgs = [...filePaths, ...illustrationPaths]

    /** Exit code returned by `upsert`. */
    const code = upsert(mixedArgs, messageStream)

    assert.strictEqual(
      messageStream.read()?.toString(),
      `[1/3] ${filePaths[0]}\n[2/3] ${filePaths[1]}\n[3/3] ${filePaths[2]}\n`,
    )

    /** Event rows persisted by the upsert run. */
    const events = readEvents()

    assert.strictEqual(events.length, 3)

    assert.strictEqual(events[0].slug, 'event-1')
    assert.strictEqual(events[0].title, 'Event 1')
    assert.strictEqual(events[0].description, '\nbody\n')
    assert.strictEqual(events[0].illustration_hash, '410f1533ea6a277deec4dcb22851bf4cf451e2db90d9e94514742aaa53fdcdd1')
    assert.strictEqual(events[0].start_date, '2026-04-15')
    assert.strictEqual(events[0].end_date, '2026-04-22')
    assert.strictEqual(events[0].seasonal_year, 2026)
    assert.strictEqual(events[0].season, 1)
    assert.strictEqual(events[0].position, 1)

    assert.strictEqual(events[1].slug, 'event-2')
    assert.strictEqual(events[1].title, 'Event 2')
    assert.strictEqual(events[1].description, '\nbody\n')
    assert.strictEqual(events[1].illustration_hash, '5e1cff0e796f7b8b3a765ff4774598d1298497a9c22740051660e0995a135634')
    assert.strictEqual(events[1].start_date, '2026-04-15')
    assert.strictEqual(events[1].end_date, '2026-04-22')
    assert.strictEqual(events[1].seasonal_year, 2026)
    assert.strictEqual(events[1].season, 1)
    assert.strictEqual(events[1].position, 2)

    assert.strictEqual(events[2].slug, 'event-3')
    assert.strictEqual(events[2].title, 'Event 3')
    assert.strictEqual(events[2].description, '\nbody\n')
    assert.strictEqual(events[2].illustration_hash, '519704da57d5ac2f8fadf0b0a2ed258fdc5cd9f800db3eb44351c0f9e959f476')
    assert.strictEqual(events[2].start_date, '2026-04-15')
    assert.strictEqual(events[2].end_date, '2026-04-22')
    assert.strictEqual(events[2].seasonal_year, 2026)
    assert.strictEqual(events[2].season, 1)
    assert.strictEqual(events[2].position, 3)

    assert.strictEqual(readFileSync(`${dbPath}.blobs/event-1.png`, 'utf8'), 'illustration-1')
    assert.strictEqual(readFileSync(`${dbPath}.blobs/event-2.png`, 'utf8'), 'illustration-2')
    assert.strictEqual(readFileSync(`${dbPath}.blobs/event-3.png`, 'utf8'), 'illustration-3')

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })

  describe('when a file fails to process', () => {
    it('writes the EventFileError, aborts the batch, and returns OPERATIONAL_ERROR_EXIT_CODE', () => {
      /** Malformed metadata overwriting the second file; rejected by `parseEventMeta`. */
      const brokenContent = '---\n{ broken json\n---\n\n# Event\n\nbody\n'

      writeFileSync(filePaths[1], brokenContent)

      /** Exit code returned by `upsert`. */
      const code = upsert(filePaths, messageStream)

      /** Output lines written to the message stream during the run. */
      const lines = (messageStream.read()?.toString() ?? '').split('\n')

      assert.strictEqual(lines[0], `[1/3] ${filePaths[0]}`)
      assert.strictEqual(lines[1], `[2/3] ${filePaths[1]}`)
      assert.ok(lines[2].startsWith(`${filePaths[1]}: malformed metadata (must be a JSON object): `))
      assert.strictEqual(readEvents().length, 1)
      assert.strictEqual(code, OPERATIONAL_ERROR_EXIT_CODE)
    })
  })
})
