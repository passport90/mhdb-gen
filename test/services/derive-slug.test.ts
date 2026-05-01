import { before, beforeEach, describe, it, mock } from 'node:test'
import type EventSlot from '../../src/types/event-slot.js'
import type ParsedEvent from '../../src/types/parsed-event.js'
import assert from 'node:assert/strict'

describe('deriveSlug', () => {
  /** Parsed event the slug is derived for. */
  const subjectEvent: ParsedEvent = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    title: 'Hello World',
    description: '\nbody\n',
  }

  /** Slug the real `slugify` produces for `subjectEvent.title`; the dedup loop builds suffixes off this. */
  const baseSlug = 'hello-world'

  /** Service under test; bound after the leaf mock is registered. */
  let deriveSlug: typeof import('../../src/services/derive-slug.js').default

  /** Mock conflict checker; default resolves to `false` (slug is free). */
  const mockIsSlugConflicting = mock.fn<(slug: string, slot: EventSlot) => Promise<boolean>>(async () => false)

  before(async () => {
    mock.module('../../src/repositories/is-slug-conflicting.js', { defaultExport: mockIsSlugConflicting })

    deriveSlug = (await import('../../src/services/derive-slug.js')).default
  })

  beforeEach(() => {
    mockIsSlugConflicting.mock.resetCalls()
    mockIsSlugConflicting.mock.mockImplementation(async () => false)
  })

  it('slugifies the title and returns the base slug when no row conflicts', async () => {
    assert.strictEqual(await deriveSlug(subjectEvent), baseSlug)
    assert.deepStrictEqual(mockIsSlugConflicting.mock.calls[0].arguments, [baseSlug, subjectEvent])
  })

  describe('when the base slug conflicts with another row', () => {
    it('appends -2 and returns the first free suffix', async () => {
      mockIsSlugConflicting.mock.mockImplementation(async slug => slug === baseSlug)

      assert.strictEqual(await deriveSlug(subjectEvent), 'hello-world-2')
      assert.deepStrictEqual(
        mockIsSlugConflicting.mock.calls.map(call => call.arguments[0]),
        ['hello-world', 'hello-world-2'],
      )
    })
  })

  describe('when the base slug and -2 both conflict with other rows', () => {
    it('walks the counter to -3', async () => {
      /** Slugs that simulate as already taken by other slots. */
      const takenSlugs = new Set(['hello-world', 'hello-world-2'])

      mockIsSlugConflicting.mock.mockImplementation(async slug => takenSlugs.has(slug))

      assert.strictEqual(await deriveSlug(subjectEvent), 'hello-world-3')
      assert.deepStrictEqual(
        mockIsSlugConflicting.mock.calls.map(call => call.arguments[0]),
        ['hello-world', 'hello-world-2', 'hello-world-3'],
      )
    })
  })
})
