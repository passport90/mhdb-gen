import { describe, it } from 'node:test'
import UsageError from '../../src/errors/usage-error.js'
import assert from 'node:assert/strict'
import groupUpsertArgs from '../../src/services/group-upsert-args.js'

describe('groupUpsertArgs', () => {
  it('groups argv into one EventSource per `.md`, pairing each with its sibling `.png` by basename', () => {
    /** Mixed argv: each `.md` followed by its sibling `.png`, the canonical shape from globbed input. */
    const args = [
      '/tmp/content/a.md',
      '/tmp/content/a.png',
      '/tmp/content/b.md',
      '/tmp/content/b.png',
      '/tmp/content/c.md',
      '/tmp/content/c.png',
    ]

    assert.deepStrictEqual(groupUpsertArgs(args), [
      { entryFilePath: '/tmp/content/a.md', illustrationFilePath: '/tmp/content/a.png' },
      { entryFilePath: '/tmp/content/b.md', illustrationFilePath: '/tmp/content/b.png' },
      { entryFilePath: '/tmp/content/c.md', illustrationFilePath: '/tmp/content/c.png' },
    ])
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

  describe('when files end the walk without a sibling', () => {
    it('throws a UsageError listing every orphan', () => {
      assert.throws(
        () => groupUpsertArgs([
          '/tmp/content/event.md',
          '/tmp/content/event.png',
          '/tmp/content/orphan-md.md',
          '/tmp/content/orphan-png.png',
        ]),
        (err: unknown) => err instanceof UsageError
          && err.message.includes('/tmp/content/orphan-md.md')
          && err.message.includes('/tmp/content/orphan-png.png'),
      )
    })
  })
})
