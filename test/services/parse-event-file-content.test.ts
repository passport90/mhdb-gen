import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parseEventFileContent from '../../src/services/parse-event-file-content.js'

describe('parseEventFileContent', () => {
  it('parses raw file content into a `ParsedEvent`', () => {
    /** Raw file content with valid frontmatter, an H1, and a body. */
    const content = `---
{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}
---

# My Event

description body
`

    assert.deepStrictEqual(parseEventFileContent(content), {
      seasonalYear: 2026,
      season: 1,
      position: 3,
      startDate: '2026-04-15',
      endDate: '2026-04-22',
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
      const content = '---\n{"seasonalYear":2026}\n\n# Event\n\nbody\n'

      assert.throws(
        () => parseEventFileContent(content),
        /unterminated frontmatter/,
      )
    })
  })

  describe('when the body has no H1 line', () => {
    it('throws a missing-title error', () => {
      /** Content with valid frontmatter but no H1 in the body. */
      const content = `---
{"seasonalYear":2026,"season":1,"position":3,"startDate":"2026-04-15","endDate":"2026-04-22"}
---

just a description, no title
`

      assert.throws(
        () => parseEventFileContent(content),
        /missing H1 title/,
      )
    })
  })
})
