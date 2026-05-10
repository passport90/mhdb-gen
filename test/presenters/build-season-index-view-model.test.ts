import { describe, it } from 'node:test'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import type TimelineEvent from '../../src/types/timeline-event.js'
import assert from 'node:assert/strict'
import buildSeasonIndexViewModel from '../../src/presenters/build-season-index-view-model.js'

describe('buildSeasonIndexViewModel', () => {
  /** Slot of the page being projected. */
  const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

  /** Two events in the slot, in position order. */
  const events: TimelineEvent[] = [
    { slug: 'first', title: 'First *Event*', startDate: '1066-04-15', endDate: '1066-04-22' },
    { slug: 'second', title: 'Second Event', startDate: '1066-05-01', endDate: '1066-05-01' },
  ]

  it('projects every field — season label, breadcrumb year + path, timeline entries, prev/next links', () => {
    /** View model produced by the SUT. */
    const viewModel = buildSeasonIndexViewModel(
      slot,
      events,
      { seasonalYear: 1066, season: 0 },
      { seasonalYear: 1066, season: 2 },
    )

    assert.strictEqual(viewModel.seasonLabel, 'Spring 1066')
    assert.strictEqual(viewModel.yearLabel, '1066')
    assert.strictEqual(viewModel.yearIndexPagePath, '1066/index.html')
    assert.deepStrictEqual(viewModel.timelineEntries, [
      {
        dateRangeLabel: 'April 15–22, 1066',
        titleInlineHtml: 'First <em>Event</em>',
        eventPagePath: '1066/1/first/index.html',
      },
      {
        dateRangeLabel: 'May 1, 1066',
        titleInlineHtml: 'Second Event',
        eventPagePath: '1066/1/second/index.html',
      },
    ])
    assert.deepStrictEqual(viewModel.prevSeasonLink, {
      label: 'Winter 1066',
      indexPagePath: '1066/0/index.html',
    })
    assert.deepStrictEqual(viewModel.nextSeasonLink, {
      label: 'Summer 1066',
      indexPagePath: '1066/2/index.html',
    })
  })

  describe('when there is no previous slot', () => {
    it('sets prevSeasonLink to null', () => {
      /** View model with `prevSlot` null. */
      const viewModel = buildSeasonIndexViewModel(slot, events, null, { seasonalYear: 1066, season: 2 })

      assert.strictEqual(viewModel.prevSeasonLink, null)
    })
  })

  describe('when there is no next slot', () => {
    it('sets nextSeasonLink to null', () => {
      /** View model with `nextSlot` null. */
      const viewModel = buildSeasonIndexViewModel(slot, events, { seasonalYear: 1066, season: 0 }, null)

      assert.strictEqual(viewModel.nextSeasonLink, null)
    })
  })
})
