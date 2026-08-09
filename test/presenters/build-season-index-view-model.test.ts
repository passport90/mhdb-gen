import { describe, it } from 'node:test'
import type EventListing from '../../src/types/event-listing.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'
import buildSeasonIndexViewModel from '../../src/presenters/build-season-index-view-model.js'

describe('buildSeasonIndexViewModel', () => {
  /** Slot of the page being projected. */
  const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

  /** Two listings in the slot, in position order. */
  const events: EventListing[] = [
    {
      id: 1,
      title: 'First *Event*',
      slug: 'first-event',
      startDate: '1066-04-15',
      endDate: '1066-04-22',
      seasonalYear: 1066,
      season: 1,
      position: 1,
      renderedAt: null,
      updatedAt: '1066-04-01 00:00:00',
    },
    {
      id: 2,
      title: 'Second Event',
      slug: 'second-event',
      startDate: '1066-05-01',
      endDate: '1066-05-01',
      seasonalYear: 1066,
      season: 1,
      position: 2,
      renderedAt: null,
      updatedAt: '1066-04-01 00:00:00',
    },
  ]

  it('projects every field — season label, breadcrumb year + path, timeline entries', () => {
    /** View model produced by the SUT. */
    const viewModel = buildSeasonIndexViewModel({
      slot,
      eventsInSlot: events,
    })

    assert.strictEqual(viewModel.seasonLabel, 'Spring 1066')
    assert.strictEqual(viewModel.yearLabel, '1066')
    assert.strictEqual(viewModel.yearIndexPagePath, '1066/index.html')
    assert.deepStrictEqual(viewModel.timelineEntries, [
      {
        dateRangeLabel: 'April 15–22, 1066',
        titleInlineHtml: 'First <em>Event</em>',
        eventPagePath: '1066/1-spring/1-first-event/index.html',
      },
      {
        dateRangeLabel: 'May 1, 1066',
        titleInlineHtml: 'Second Event',
        eventPagePath: '1066/1-spring/2-second-event/index.html',
      },
    ])
  })
})
