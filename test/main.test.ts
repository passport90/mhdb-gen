import { before, beforeEach, describe, it, mock } from 'node:test'
import { PassThrough } from 'node:stream'
import { USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import assert from 'node:assert/strict'

describe('main', () => {
  /** Top-level dispatcher under test; bound after the file processor mock is registered. */
  let main: typeof import('../src/main.js').default

  /** Mock file processor — the leaf at the bottom of the spine; tracks the paths that propagate from `main`. */
  const mockProcessEventFile = mock.fn<(path: string) => Promise<void>>(async () => {})

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  before(async () => {
    mock.module('../src/services/process-event-file.js', {
      defaultExport: mockProcessEventFile,
    })

    main = (await import('../src/main.js')).default
  })

  beforeEach(() => {
    mockProcessEventFile.mock.resetCalls()
    messageStream = new PassThrough()
  })

  it('dispatches the command to its controller', async () => {
    /** Exit code returned by `main`. */
    const code = await main(['upsert', 'a.md', 'b.md'], messageStream)

    /** Paths the leaf was called with, in invocation order. */
    const calledPaths = mockProcessEventFile.mock.calls.map(call => call.arguments[0])

    assert.deepStrictEqual(calledPaths, ['a.md', 'b.md'])
    assert.strictEqual(code, 0)
  })

  describe('when no command is given', () => {
    it('prints usage and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main([], messageStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(messageStream.read()?.toString() ?? '', /^usage: /)
      assert.strictEqual(mockProcessEventFile.mock.callCount(), 0)
    })
  })
})
