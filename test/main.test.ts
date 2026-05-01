import { SUCCESS_EXIT_CODE, USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import type EventSlot from '../src/types/event-slot.js'
import type ParsedEvent from '../src/types/parsed-event.js'
import { PassThrough } from 'node:stream'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('main', () => {
  /** Markdown fixture content written into the tmp file; passes real `parseEventFileContent` end-to-end. */
  const fixtureContent = `---
{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}
---

# Event

body
`

  /** Top-level dispatcher under test; bound after the leaf mocks are registered. */
  let main: typeof import('../src/main.js').default

  /** Mock slugifier; resolves to empty string. */
  const mockSlugify = mock.fn<(title: string) => string>(() => '')

  /** Mock conflict checker; resolves to `false` (slug is free). */
  const mockIsSlugConflicting = mock.fn<(slug: string, slot: EventSlot) => Promise<boolean>>(async () => false)

  /** Mock upserter — leaf at the bottom of the spine; its call count is the only signal asserted. */
  const mockUpsertEvent = mock.fn<(event: ParsedEvent, slug: string) => Promise<void>>(async () => {})

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  /** Tmp directory created fresh per test; holds the real markdown fixture. */
  let tmpDir: string

  before(async () => {
    mock.module('../src/services/slugify.js', { defaultExport: mockSlugify })
    mock.module('../src/services/is-slug-conflicting.js', { defaultExport: mockIsSlugConflicting })
    mock.module('../src/services/upsert-event.js', { defaultExport: mockUpsertEvent })

    main = (await import('../src/main.js')).default
  })

  beforeEach(async () => {
    mockUpsertEvent.mock.resetCalls()
    messageStream = new PassThrough()
    tmpDir = await mkdtemp(join(tmpdir(), 'mhdb-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('dispatches the command to its controller', async () => {
    /** Tmp path the upsert controller is invoked against. */
    const filePath = join(tmpDir, 'a.md')

    await writeFile(filePath, fixtureContent)

    /** Exit code returned by `main`. */
    const code = await main(['upsert', filePath], messageStream)

    assert.strictEqual(mockUpsertEvent.mock.callCount(), 1)
    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })

  describe('when no command is given', () => {
    it('prints usage and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main([], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /^usage: /)
      assert.strictEqual(mockUpsertEvent.mock.callCount(), 0)
    })
  })

  describe('when the command is unknown', () => {
    it('writes the UsageError message and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main(['nope'], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /unknown command: 'nope'/)
      assert.strictEqual(mockUpsertEvent.mock.callCount(), 0)
    })
  })
})
