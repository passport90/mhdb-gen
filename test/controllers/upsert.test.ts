import { OPERATIONAL_ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { PassThrough } from 'node:stream'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import upsert from '../../src/controllers/upsert.js'

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

  /** Tmp directory created fresh per test; holds real markdown fixtures and the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Tmp paths the controller is invoked against, written fresh per test. */
  let filePaths: string[]

  beforeEach(async () => {
    messageStream = new PassThrough()
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    await applyMigrations(dbPath)
    filePaths = ['a.md', 'b.md', 'c.md'].map(name => join(tmpDir, name))
    await Promise.all(filePaths.map((path, index) => writeFile(path, buildFixtureContent(index + 1))))
  })

  afterEach(async () => {
    delete process.env.MHDB_DB_PATH
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('processes each file path in order and writes a progress line per file', async () => {
    /** Exit code returned by `upsert`. */
    const code = await upsert(filePaths, messageStream)

    assert.strictEqual(
      messageStream.read()?.toString(),
      `[1/3] ${filePaths[0]}\n[2/3] ${filePaths[1]}\n[3/3] ${filePaths[2]}\n`,
    )

    /** Database handle for verifying the inserted rows. */
    const db = new DatabaseSync(dbPath)

    /** Row count in the `events` table after the run. */
    const rowCount = (db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number }).count

    db.close()

    assert.strictEqual(rowCount, 3)
    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })

  describe('when a file fails to process', () => {
    it('writes the EventFileError, aborts the batch, and returns OPERATIONAL_ERROR_EXIT_CODE', async () => {
      /** Broken metadata overwriting the second file; the real `parseEventMeta` rejects this. */
      const brokenContent = '---\n{ broken json\n---\n\n# Event\n\nbody\n'

      await writeFile(filePaths[1], brokenContent)

      /** Exit code returned by `upsert`. */
      const code = await upsert(filePaths, messageStream)

      /** Output lines written to the message stream during the run. */
      const lines = (messageStream.read()?.toString() ?? '').split('\n')

      /** Database handle for verifying the partial run. */
      const db = new DatabaseSync(dbPath)

      /** Row count after the run; only the first file should have committed. */
      const rowCount = (db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number }).count

      db.close()

      assert.strictEqual(lines[0], `[1/3] ${filePaths[0]}`)
      assert.strictEqual(lines[1], `[2/3] ${filePaths[1]}`)
      assert.ok(lines[2].startsWith(`${filePaths[1]}: malformed metadata (must be a JSON object): `))
      assert.strictEqual(rowCount, 1)
      assert.strictEqual(code, OPERATIONAL_ERROR_EXIT_CODE)
    })
  })
})
