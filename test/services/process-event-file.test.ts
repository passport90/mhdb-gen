import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import EventFileError from '../../src/errors/event-file-error.js'
import type ParsedEvent from '../../src/types/parsed-event.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
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

  /** `ParsedEvent` the real `parseEventFileContent` should produce from `fixtureContent`. */
  const expectedEvent: ParsedEvent = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    title: 'My Event',
    description: '\ndescription body\n',
  }

  /** Slug the real `slugify` produces for `expectedEvent.title`. */
  const expectedSlug = 'my-event'

  /** Service under test; bound after the leaf mock is registered. */
  let processEventFile: typeof import('../../src/services/process-event-file.js').default

  /** Mock upserter; resolves to undefined. */
  const mockUpsertEvent = mock.fn<(event: ParsedEvent, slug: string) => Promise<void>>(async () => {})

  /** Tmp directory created fresh per test; holds the real markdown fixture and the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  before(async () => {
    mock.module('../../src/repositories/upsert-event.js', { defaultExport: mockUpsertEvent })

    processEventFile = (await import('../../src/services/process-event-file.js')).default
  })

  beforeEach(async () => {
    mockUpsertEvent.mock.resetCalls()
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

    assert.deepStrictEqual(mockUpsertEvent.mock.calls[0].arguments, [expectedEvent, expectedSlug])
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
