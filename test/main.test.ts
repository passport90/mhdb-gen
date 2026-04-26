import { before, beforeEach, describe, it, mock } from 'node:test'
import { PassThrough } from 'node:stream'
import { USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import assert from 'node:assert/strict'

describe('main', () => {
  /** Top-level dispatcher under test; bound after the file processor mock is registered. */
  let main: typeof import('../src/main.js').default

  /** Mock file processor — the leaf at the bottom of the spine; tracks the paths that propagate from `main`. */
  const mockProcessEventFile = mock.fn<(path: string) => Promise<void>>(async () => {})

  /** Input stream, reset to a fresh `PassThrough` per test. */
  let inputStream: PassThrough

  /** Output stream, reset to a fresh `PassThrough` per test. */
  let outputStream: PassThrough

  /** Error stream, reset to a fresh `PassThrough` per test. */
  let errorStream: PassThrough

  before(async () => {
    mock.module('../src/process-event-file.js', {
      defaultExport: mockProcessEventFile,
    })

    main = (await import('../src/main.js')).default
  })

  beforeEach(() => {
    mockProcessEventFile.mock.resetCalls()
    inputStream = new PassThrough()
    outputStream = new PassThrough()
    errorStream = new PassThrough()
  })

  it('dispatches the command to its controller', async () => {
    /** Exit code returned by `main`. */
    const code = await main(['upsert', 'a.md', 'b.md'], inputStream, outputStream, errorStream)

    /** Paths the leaf was called with, in invocation order. */
    const calledPaths = mockProcessEventFile.mock.calls.map(call => call.arguments[0])

    assert.deepStrictEqual(calledPaths, ['a.md', 'b.md'])
    assert.strictEqual(code, 0)
  })

  describe('when no command is given', () => {
    it('prints usage to the error stream and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main([], inputStream, outputStream, errorStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(errorStream.read()?.toString() ?? '', /^usage: /)
      assert.strictEqual(outputStream.read(), null)
      assert.strictEqual(mockProcessEventFile.mock.callCount(), 0)
    })
  })
})
