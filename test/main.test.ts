import { before, beforeEach, describe, it, mock } from 'node:test'
import type Controller from '../src/types/controller.js'
import { PassThrough } from 'node:stream'
import { USAGE_ERROR_EXIT_CODE } from '../src/constants/exit-codes.js'
import assert from 'node:assert/strict'

describe('main', () => {
  /**
   * Top-level dispatcher under test; bound to the real `main` module after the
   * upsert controller mock is registered.
   */
  let main: typeof import('../src/main.js').default

  /** Mock upsert controller — tracks calls; returns 0 by default, overridable per test via `mockImplementationOnce`. */
  const mockUpsertController = mock.fn<Controller>(async () => 0)

  /** Input stream, reset to a fresh `PassThrough` per test. */
  let inputStream: PassThrough

  /** Output stream, reset to a fresh `PassThrough` per test. */
  let outputStream: PassThrough

  /** Error stream, reset to a fresh `PassThrough` per test. */
  let errorStream: PassThrough

  before(async () => {
    mock.module('../src/controllers/upsert.js', {
      defaultExport: mockUpsertController,
    })

    main = (await import('../src/main.js')).default
  })

  beforeEach(() => {
    mockUpsertController.mock.resetCalls()
    inputStream = new PassThrough()
    outputStream = new PassThrough()
    errorStream = new PassThrough()
  })

  it('dispatches to the resolved controller and returns its exit code', async () => {
    mockUpsertController.mock.mockImplementationOnce(async () => 42)

    /** Exit code returned by `main`. */
    const code = await main(['upsert', 'a', 'b'], inputStream, outputStream, errorStream)

    /** First call captured by the mock controller. */
    const call = mockUpsertController.mock.calls[0]
    assert.deepStrictEqual(call?.arguments[0], ['a', 'b'])
    assert.strictEqual(call?.arguments[1], inputStream)
    assert.strictEqual(call?.arguments[2], outputStream)
    assert.strictEqual(call?.arguments[3], errorStream)
    assert.strictEqual(code, 42)
  })

  describe('when no command is given', () => {
    it('prints usage to the error stream and returns 1', async () => {
      /** Exit code returned by `main`. */
      const code = await main([], inputStream, outputStream, errorStream)

      assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
      assert.match(errorStream.read()?.toString() ?? '', /^usage: /)
      assert.strictEqual(outputStream.read(), null)
      assert.strictEqual(mockUpsertController.mock.callCount(), 0)
    })
  })
})
