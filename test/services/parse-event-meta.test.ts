import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parseEventMeta from '../../src/services/parse-event-meta.js'

describe('parseEventMeta', () => {
  it('parses a JSON object that matches the schema into a `ParsedEventMeta`', () => {
    /** Valid JSON-encoded metadata that satisfies every field of the schema. */
    const validMetaJson
      = '{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}'

    assert.deepStrictEqual(parseEventMeta(validMetaJson), {
      seasonalYear: 2026,
      season: 1,
      position: 3,
      startDate: '2026-04-15',
      endDate: '2026-04-22',
    })
  })

  describe('when the input is not valid JSON', () => {
    it('throws a malformed-metadata error with the underlying cause attached', () => {
      assert.throws(
        () => parseEventMeta('{ this is not json'),
        (err: unknown) => err instanceof Error
          && /malformed metadata \(must be a JSON object\)/.test(err.message)
          && err.cause instanceof SyntaxError,
      )
    })
  })
})
