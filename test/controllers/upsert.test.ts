import { before, beforeEach, describe, it, mock } from 'node:test'
import { PassThrough } from 'node:stream'
import assert from 'node:assert/strict'

describe('upsert', () => {
  /** Upsert controller under test; bound after the file processor mock is registered. */
  let upsert: typeof import('../../src/controllers/upsert.js').default

  /** Mock file processor — tracks calls; resolves to undefined by default. */
  const mockProcessEventFile = mock.fn<(path: string) => Promise<void>>(async () => {})

  /** Message stream, reset to a fresh `PassThrough` per test. */
  let messageStream: PassThrough

  before(async () => {
    mock.module('../../src/process-event-file.js', {
      defaultExport: mockProcessEventFile,
    })

    upsert = (await import('../../src/controllers/upsert.js')).default
  })

  beforeEach(() => {
    mockProcessEventFile.mock.resetCalls()
    messageStream = new PassThrough()
  })

  it('processes each file path in order and writes a progress line per file', async () => {
    /** Exit code returned by `upsert`. */
    const code = await upsert(['a.md', 'b.md', 'c.md'], messageStream)

    /** Paths the leaf was called with, in invocation order. */
    const calledPaths = mockProcessEventFile.mock.calls.map(call => call.arguments[0])

    assert.deepStrictEqual(calledPaths, ['a.md', 'b.md', 'c.md'])
    assert.strictEqual(messageStream.read()?.toString(), '[1/3] a.md\n[2/3] b.md\n[3/3] c.md\n')
    assert.strictEqual(code, 0)
  })
})
