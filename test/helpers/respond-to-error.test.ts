import { OPERATIONAL_ERROR_EXIT_CODE, USAGE_ERROR_EXIT_CODE } from '../../src/constants/exit-codes.js'
import { describe, it } from 'node:test'
import { PassThrough } from 'node:stream'
import UsageError from '../../src/errors/usage-error.js'
import assert from 'node:assert/strict'
import readBufferedText from '../support/read-buffered-text.js'
import respondToError from '../../src/helpers/respond-to-error.js'

describe('respondToError', () => {
  it('writes the message and returns the usage code for a UsageError', () => {
    /** Stream captured to assert what the responder wrote. */
    const messageStream = new PassThrough()

    /** Exit code returned by the responder. */
    const code = respondToError(new UsageError('unknown command'), messageStream)

    assert.strictEqual(readBufferedText(messageStream), 'unknown command\n')
    assert.strictEqual(code, USAGE_ERROR_EXIT_CODE)
  })

  describe('when the error is any other Error', () => {
    it('writes the message and returns the operational code', () => {
      /** Stream captured to assert what the responder wrote. */
      const messageStream = new PassThrough()

      /** Exit code returned by the responder. */
      const code = respondToError(new Error('database is locked'), messageStream)

      assert.strictEqual(readBufferedText(messageStream), 'database is locked\n')
      assert.strictEqual(code, OPERATIONAL_ERROR_EXIT_CODE)
    })
  })

  describe('when the thrown value is not an Error', () => {
    it('stringifies the value and returns the operational code', () => {
      /** Stream captured to assert what the responder wrote. */
      const messageStream = new PassThrough()

      /** Exit code returned by the responder. */
      const code = respondToError('raw failure', messageStream)

      assert.strictEqual(readBufferedText(messageStream), 'raw failure\n')
      assert.strictEqual(code, OPERATIONAL_ERROR_EXIT_CODE)
    })
  })
})
