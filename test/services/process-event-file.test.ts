import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import EventFileError from '../../src/errors/event-file-error.js'
import type ParsedEvent from '../../src/types/parsed-event.js'
import type ParsedEventMeta from '../../src/types/parsed-event-meta.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('processEventFile', () => {
  /** Sample `ParsedEventMeta` the mock parser returns; distinct values pin arg flow in the wiring assertion. */
  const testEventMeta: ParsedEventMeta = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
  }

  /** Slug the mock deriver returns. */
  const testSlug = 'my-event'

  /** Meta source the real `splitFile` lifts from `fixtureContent` and forwards to `parseEventMeta`. */
  const expectedMeta = JSON.stringify(testEventMeta, null, 2)

  /** Markdown fixture content; the real parser composes title and description from this. */
  const fixtureContent = `---\n${expectedMeta}\n---\n\n# My Event\n\ndescription body\n`

  /** Composed `ParsedEvent` the real `parseEventFileContent` will produce from `fixtureContent` and the mock fields. */
  const expectedEvent: ParsedEvent = {
    ...testEventMeta,
    title: 'My Event',
    description: '\ndescription body\n',
  }

  /** Service under test; bound after the leaf mocks are registered. */
  let processEventFile: typeof import('../../src/services/process-event-file.js').default

  /** Mock metadata parser; returns `testEventMeta`. */
  const mockParseEventMeta = mock.fn<(meta: string) => ParsedEventMeta>(() => testEventMeta)

  /** Mock slug deriver; resolves to `testSlug`. */
  const mockDeriveSlug = mock.fn<(title: string) => Promise<string>>(async () => testSlug)

  /** Mock upserter; resolves to undefined. */
  const mockUpsertEvent = mock.fn<(event: ParsedEvent, slug: string) => Promise<void>>(async () => {})

  /** Tmp directory created fresh per test; holds the real markdown fixture. */
  let tmpDir: string

  before(async () => {
    mock.module('../../src/services/parse-event-meta.js', { defaultExport: mockParseEventMeta })
    mock.module('../../src/services/derive-slug.js', { defaultExport: mockDeriveSlug })
    mock.module('../../src/services/upsert-event.js', { defaultExport: mockUpsertEvent })

    processEventFile = (await import('../../src/services/process-event-file.js')).default
  })

  beforeEach(async () => {
    mockParseEventMeta.mock.resetCalls()
    mockDeriveSlug.mock.resetCalls()
    mockUpsertEvent.mock.resetCalls()
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('reads the file, parses it, derives a slug, and upserts the composed event', async () => {
    /** Path to the real markdown fixture written for this test. */
    const filePath = join(tmpDir, 'event.md')

    await writeFile(filePath, fixtureContent)

    await processEventFile(filePath)

    assert.deepStrictEqual(mockParseEventMeta.mock.calls[0].arguments, [expectedMeta])
    assert.deepStrictEqual(mockDeriveSlug.mock.calls[0].arguments, [expectedEvent.title])
    assert.deepStrictEqual(mockUpsertEvent.mock.calls[0].arguments, [expectedEvent, testSlug])
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
