import { describe, it } from 'node:test'
import UsageError from '../../src/errors/usage-error.js'
import assert from 'node:assert/strict'
import groupUpsertArgs from '../../src/services/group-upsert-args.js'

describe('groupUpsertArgs', () => {
  it('groups argv into one EventSource per `.md`, pairing each with its sibling `.png` by basename', () => {
    /** Mixed argv: `a.md` alone, `b.md`+`b.png` paired, `c.md`+`c.png` paired across argv distance. */
    const args = [
      '/tmp/content/a.md',
      '/tmp/content/b.md',
      '/tmp/content/b.png',
      '/tmp/content/c.md',
      '/tmp/content/c.png',
    ]

    assert.deepStrictEqual(groupUpsertArgs(args), [
      { entryFilePath: '/tmp/content/a.md', illustrationFilePath: null },
      { entryFilePath: '/tmp/content/b.md', illustrationFilePath: '/tmp/content/b.png' },
      { entryFilePath: '/tmp/content/c.md', illustrationFilePath: '/tmp/content/c.png' },
    ])
  })

  describe('when an argv path has neither a `.md` nor `.png` extension', () => {
    it('throws a UsageError listing every unsupported path', () => {
      assert.throws(
        () => groupUpsertArgs(['/tmp/content/event.md', '/tmp/content/notes.txt', '/tmp/content/log.csv']),
        (err: unknown) => err instanceof UsageError
          && err.message.includes('/tmp/content/notes.txt')
          && err.message.includes('/tmp/content/log.csv'),
      )
    })
  })

  describe('when an argv `.png` has no matching `.md`', () => {
    it('throws a UsageError listing every orphan illustration', () => {
      assert.throws(
        () => groupUpsertArgs([
          '/tmp/content/event.md',
          '/tmp/content/orphan.png',
          '/tmp/content/stray.png',
        ]),
        (err: unknown) => err instanceof UsageError
          && err.message.includes('/tmp/content/orphan.png')
          && err.message.includes('/tmp/content/stray.png'),
      )
    })
  })
})
