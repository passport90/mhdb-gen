import { before, beforeEach, describe, it, mock } from 'node:test'
import type ParsedEventMeta from '../../src/types/parsed-event-meta.js'
import assert from 'node:assert/strict'

describe('parseEventFileContent', () => {
  /** Sample `ParsedEventMeta` the mock parser returns; distinct values pin arg flow in the wiring assertion. */
  const testEventMeta: ParsedEventMeta = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
  }

  /** Service under test; bound after the leaf mock is registered. */
  let parseEventFileContent: typeof import('../../src/services/parse-event-file-content.js').default

  /** Mock frontmatter parser; returns `testEventMeta`. */
  const mockParseFrontmatter = mock.fn<(yaml: string) => ParsedEventMeta>(() => testEventMeta)

  before(async () => {
    mock.module('../../src/services/parse-frontmatter.js', { defaultExport: mockParseFrontmatter })

    parseEventFileContent = (await import('../../src/services/parse-event-file-content.js')).default
  })

  beforeEach(() => {
    mockParseFrontmatter.mock.resetCalls()
  })

  it('passes YAML to parseParsedEventMeta and composes the event with title and description from the body', () => {
    /** Raw file content with valid frontmatter, an H1, and a body. */
    const content = '---\nseasonal_year: 2026\nposition: 3\n---\n\n# My Event\n\ndescription body\n'

    /** Parsed event returned by the service. */
    const result = parseEventFileContent(content)

    assert.deepStrictEqual(mockParseFrontmatter.mock.calls[0].arguments, [
      'seasonal_year: 2026\nposition: 3',
    ])

    assert.deepStrictEqual(result, {
      ...testEventMeta,
      title: 'My Event',
      description: '\ndescription body\n',
    })
  })

  describe('when the content has no opening frontmatter fence', () => {
    it('throws a missing-frontmatter error', () => {
      assert.throws(
        () => parseEventFileContent('# Event\n\nbody\n'),
        /missing frontmatter/,
      )
    })
  })

  describe('when the frontmatter has no closing fence', () => {
    it('throws an unterminated-frontmatter error', () => {
      /** Content that opens a frontmatter block but never closes it. */
      const content = '---\nseasonal_year: 2026\n\n# Event\n\nbody\n'

      assert.throws(
        () => parseEventFileContent(content),
        /unterminated frontmatter/,
      )
    })
  })

  describe('when the body has no H1 line', () => {
    it('throws a missing-title error', () => {
      /** Content with valid frontmatter but no H1 in the body. */
      const content = '---\nseasonal_year: 2026\n---\n\njust a description, no title\n'

      assert.throws(
        () => parseEventFileContent(content),
        /missing H1 title/,
      )
    })
  })
})
