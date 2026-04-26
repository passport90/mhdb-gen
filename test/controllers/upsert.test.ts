import { OPERATIONAL_ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import type ParsedEvent from '../../src/types/parsed-event.js'
import type ParsedEventMeta from '../../src/types/parsed-event-meta.js'
import { PassThrough } from 'node:stream'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('upsert', () => {
  /** Placeholder `ParsedEventMeta` returned by the mock parser. */
  const emptyEventMeta: ParsedEventMeta = {
    seasonalYear: 0,
    season: 0,
    position: 0,
    startDate: '',
    endDate: '',
  }

  /** Markdown fixture content written into each tmp file; passes the real `parseEventFileContent`. */
  const fixtureContent = '---\nplaceholder: 0\n---\n\n# Event\n\nbody\n'

  /** Upsert controller under test; bound after the leaf mocks are registered. */
  let upsert: typeof import('../../src/controllers/upsert.js').default

  /** Mock frontmatter parser; per-call overrides drive the failure case via `mockImplementationOnce`. */
  const mockParseFrontmatter = mock.fn<(yaml: string) => ParsedEventMeta>(() => emptyEventMeta)

  /** Mock slug deriver; resolves to empty string. */
  const mockDeriveSlug = mock.fn<(title: string) => Promise<string>>(async () => '')

  /** Mock upserter; resolves to undefined. */
  const mockUpsertEvent = mock.fn<(event: ParsedEvent, slug: string) => Promise<void>>(async () => {})

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  /** Tmp directory created fresh per test; holds the real markdown fixtures. */
  let tmpDir: string

  /** Tmp paths the controller is invoked against, written fresh per test. */
  let filePaths: string[]

  before(async () => {
    mock.module('../../src/services/parse-frontmatter.js', { defaultExport: mockParseFrontmatter })
    mock.module('../../src/services/derive-slug.js', { defaultExport: mockDeriveSlug })
    mock.module('../../src/services/upsert-event.js', { defaultExport: mockUpsertEvent })

    upsert = (await import('../../src/controllers/upsert.js')).default
  })

  beforeEach(async () => {
    mockParseFrontmatter.mock.resetCalls()
    mockUpsertEvent.mock.resetCalls()
    messageStream = new PassThrough()
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
    filePaths = ['a.md', 'b.md', 'c.md'].map(name => join(tmpDir, name))
    await Promise.all(filePaths.map(path => writeFile(path, fixtureContent)))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('processes each file path in order and writes a progress line per file', async () => {
    /** Exit code returned by `upsert`. */
    const code = await upsert(filePaths, messageStream)

    assert.strictEqual(
      messageStream.read()?.toString(),
      `[1/3] ${filePaths[0]}\n[2/3] ${filePaths[1]}\n[3/3] ${filePaths[2]}\n`,
    )
    assert.strictEqual(mockUpsertEvent.mock.callCount(), 3)
    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })

  describe('when a file fails to process', () => {
    it('writes the EventFileError, aborts the batch, and returns OPERATIONAL_ERROR_EXIT_CODE', async () => {
      mockParseFrontmatter.mock.mockImplementationOnce(() => {
        throw new Error('parse failed at line 4')
      }, 1)

      /** Exit code returned by `upsert`. */
      const code = await upsert(filePaths, messageStream)

      assert.strictEqual(
        messageStream.read()?.toString(),
        `[1/3] ${filePaths[0]}\n[2/3] ${filePaths[1]}\n${filePaths[1]}: parse failed at line 4\n`,
      )
      assert.strictEqual(mockUpsertEvent.mock.callCount(), 1)
      assert.strictEqual(code, OPERATIONAL_ERROR_EXIT_CODE)
    })
  })
})
