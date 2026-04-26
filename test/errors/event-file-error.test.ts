import { describe, it } from 'node:test'
import EventFileError from '../../src/errors/event-file-error.js'
import assert from 'node:assert/strict'

describe('EventFileError', () => {
  it('wraps an Error cause, preserving its message and chaining the cause', () => {
    /** Underlying Error wrapped by the `EventFileError`. */
    const cause = new Error('parse failed at line 4')

    /** Wrapped error under inspection. */
    const error = new EventFileError('/path/to/event.md', cause)

    assert.strictEqual(error.path, '/path/to/event.md')
    assert.strictEqual(error.message, 'parse failed at line 4')
    assert.strictEqual(error.cause, cause)
    assert.strictEqual(error.name, 'EventFileError')
    assert.ok(error instanceof Error)
  })

  describe('when the cause is not an Error', () => {
    it('stringifies the cause for the message and chains it as-is', () => {
      /** Wrapped error under inspection. */
      const error = new EventFileError('/path/to/event.md', 'something went wrong')

      assert.strictEqual(error.path, '/path/to/event.md')
      assert.strictEqual(error.message, 'something went wrong')
      assert.strictEqual(error.cause, 'something went wrong')
    })
  })
})
