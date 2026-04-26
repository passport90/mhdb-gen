import { before, beforeEach, describe, it, mock } from 'node:test'
import { PassThrough } from 'node:stream'
import assert from 'node:assert/strict'

describe('upsert', () => {
  /** Upsert controller under test; bound after the file processor mock is registered. */
  let upsert: typeof import('../../src/controllers/upsert.js').default

  /** Mock file processor — tracks calls; resolves to undefined by default. */
  const mockProcessEventFile = mock.fn<(path: string) => Promise<void>>(async () => {})

  /** Input stream, reset to a fresh `PassThrough` per test. */
  let inputStream: PassThrough

  /** Output stream, reset to a fresh `PassThrough` per test. */
  let outputStream: PassThrough

  /** Error stream, reset to a fresh `PassThrough` per test. */
  let errorStream: PassThrough

  before(async () => {
    mock.module('../../src/process-event-file.js', {
      defaultExport: mockProcessEventFile,
    })

    upsert = (await import('../../src/controllers/upsert.js')).default
  })

  beforeEach(() => {
    mockProcessEventFile.mock.resetCalls()
    inputStream = new PassThrough()
    outputStream = new PassThrough()
    errorStream = new PassThrough()
  })

  it('processes each file path in order and writes a progress line per file', async () => {
    /** Exit code returned by `upsert`. */
    const code = await upsert(['a.md', 'b.md', 'c.md'], inputStream, outputStream, errorStream)

    /** Paths the leaf was called with, in invocation order. */
    const calledPaths = mockProcessEventFile.mock.calls.map(call => call.arguments[0])

    assert.deepStrictEqual(calledPaths, ['a.md', 'b.md', 'c.md'])
    assert.strictEqual(errorStream.read()?.toString(), '[1/3] a.md\n[2/3] b.md\n[3/3] c.md\n')
    assert.strictEqual(outputStream.read(), null)
    assert.strictEqual(code, 0)
  })
})
