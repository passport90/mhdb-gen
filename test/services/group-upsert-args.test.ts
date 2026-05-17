import { describe, it } from 'node:test'
import UsageError from '../../src/errors/usage-error.js'
import assert from 'node:assert/strict'
import groupUpsertArgs from '../../src/services/group-upsert-args.js'

describe('groupUpsertArgs', () => {
  it('groups argv into one EventSource per `.md`, pairing each with its sibling `.png` by basename', () => {
    /** Mixed argv: `a.md`+`a.png`, `b.md`+`b.png`, `c.md`+`c.png` — interleaved across argv distance. */
    const args = [
      '/tmp/content/c.png',
      '/tmp/content/a.md',
      '/tmp/content/b.png',
      '/tmp/content/c.md',
      '/tmp/content/a.png',
      '/tmp/content/b.md',
    ]

    assert.deepStrictEqual(groupUpsertArgs(args), [
      { entryFilePath: '/tmp/content/a.md', illustrationFilePath: '/tmp/content/a.png' },
      { entryFilePath: '/tmp/content/b.md', illustrationFilePath: '/tmp/content/b.png' },
      { entryFilePath: '/tmp/content/c.md', illustrationFilePath: '/tmp/content/c.png' },
    ])
  })

  describe('when an argv `.md` has no matching `.png`', () => {
    it('throws a UsageError naming the orphan markdown', () => {
      assert.throws(
        () => groupUpsertArgs([
          '/tmp/content/event.md',
          '/tmp/content/event.png',
          '/tmp/content/orphan.md',
        ]),
        (err: unknown) => err instanceof UsageError
          && err.message === 'found orphan file /tmp/content/orphan.md',
      )
    })
  })

  describe('when an argv `.png` has no matching `.md`', () => {
    it('throws a UsageError naming the orphan illustration', () => {
      assert.throws(
        () => groupUpsertArgs([
          '/tmp/content/event.md',
          '/tmp/content/event.png',
          '/tmp/content/orphan.png',
        ]),
        (err: unknown) => err instanceof UsageError
          && err.message === 'found orphan file /tmp/content/orphan.png',
      )
    })
  })

  describe('when an argv path has an unsupported extension', () => {
    it('throws a UsageError naming the unsupported file', () => {
      assert.throws(
        () => groupUpsertArgs([
          '/tmp/content/event.md',
          '/tmp/content/event.png',
          '/tmp/content/notes.txt',
        ]),
        (err: unknown) => err instanceof UsageError
          && err.message === 'found orphan file /tmp/content/notes.txt',
      )
    })
  })
})
