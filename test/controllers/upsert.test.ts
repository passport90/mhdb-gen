import { OPERATIONAL_ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import type ParsedEvent from '../../src/types/parsed-event.js'
import { PassThrough } from 'node:stream'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('upsert', () => {
  /** Markdown fixture content written into each tmp file under test. */
  const fixtureContent = `---
{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}
---

# Event

body
`

  /** Upsert controller under test; bound after the leaf mocks are registered. */
  let upsert: typeof import('../../src/controllers/upsert.js').default

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
    mock.module('../../src/services/derive-slug.js', { defaultExport: mockDeriveSlug })
    mock.module('../../src/services/upsert-event.js', { defaultExport: mockUpsertEvent })

    upsert = (await import('../../src/controllers/upsert.js')).default
  })

  beforeEach(async () => {
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
      /** Broken metadata overwriting the second file; the real `parseEventMeta` rejects this. */
      const brokenContent = '---\n{ broken json\n---\n\n# Event\n\nbody\n'

      await writeFile(filePaths[1], brokenContent)

      /** Exit code returned by `upsert`. */
      const code = await upsert(filePaths, messageStream)

      /** Output lines written to the message stream during the run. */
      const lines = (messageStream.read()?.toString() ?? '').split('\n')

      assert.strictEqual(lines[0], `[1/3] ${filePaths[0]}`)
      assert.strictEqual(lines[1], `[2/3] ${filePaths[1]}`)
      assert.ok(lines[2].startsWith(`${filePaths[1]}: malformed metadata (must be a JSON object): `))
      assert.strictEqual(mockUpsertEvent.mock.callCount(), 1)
      assert.strictEqual(code, OPERATIONAL_ERROR_EXIT_CODE)
    })
  })
})
