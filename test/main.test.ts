import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import type ParsedEvent from '../src/types/parsed-event.js'
import { PassThrough } from 'node:stream'
import { USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('main', () => {
  /** Placeholder `ParsedEvent` returned by the mock parser. */
  const emptyParsedEvent: ParsedEvent = {
    seasonalYear: 0,
    season: 0,
    position: 0,
    startDate: '',
    endDate: '',
    title: '',
    description: '',
  }

  /** Top-level dispatcher under test; bound after the leaf mocks are registered. */
  let main: typeof import('../src/main.js').default

  /** Mock parser; returns `emptyParsedEvent`. */
  const mockParseEventFileContent = mock.fn<(content: string) => ParsedEvent>(() => emptyParsedEvent)

  /** Mock slug deriver; resolves to empty string. */
  const mockDeriveSlug = mock.fn<(title: string) => Promise<string>>(async () => '')

  /** Mock upserter — leaf at the bottom of the spine; its call count is the only signal asserted. */
  const mockUpsertEvent = mock.fn<(event: ParsedEvent, slug: string) => Promise<void>>(async () => {})

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  /** Tmp directory created fresh per test; holds the real markdown fixture. */
  let tmpDir: string

  before(async () => {
    mock.module('../src/services/parse-event-file-content.js', { defaultExport: mockParseEventFileContent })
    mock.module('../src/services/derive-slug.js', { defaultExport: mockDeriveSlug })
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

    await writeFile(filePath, '')

    /** Exit code returned by `main`. */
    const code = await main(['upsert', filePath], messageStream)

    assert.strictEqual(mockUpsertEvent.mock.callCount(), 1)
    assert.strictEqual(code, 0)
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
