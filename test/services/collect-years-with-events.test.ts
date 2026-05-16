import { describe, it } from 'node:test'
import type EventListing from '../../src/types/event-listing.js'
import assert from 'node:assert/strict'
import collectYearsWithEvents from '../../src/services/collect-years-with-events.js'

describe('collectYearsWithEvents', () => {
  it('dedupes consecutive same-year listings, preserving ascending input order', () => {
    /**
     * Listings span three distinct years; the 2026 cluster has two same-year entries to
     * exercise the dedup boundary.
     */
    const listings: EventListing[] = [
      {
        id: 1,
        title: 'Hastings',
        slug: 'hastings',
        startDate: '1066-10-14',
        endDate: '1066-10-14',
        seasonalYear: 1066,
        season: 3,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-10-01 00:00:00',
      },
      {
        id: 2,
        title: 'Spring Event',
        slug: 'spring-event',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
        seasonalYear: 2026,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 3,
        title: 'Summer Event',
        slug: 'summer-event',
        startDate: '2026-07-01',
        endDate: '2026-07-08',
        seasonalYear: 2026,
        season: 2,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-07-01 00:00:00',
      },
      {
        id: 4,
        title: 'Future Event',
        slug: 'future-event',
        startDate: '2027-04-01',
        endDate: '2027-04-08',
        seasonalYear: 2027,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '2027-04-01 00:00:00',
      },
    ]

    assert.deepStrictEqual(collectYearsWithEvents(listings), [1066, 2026, 2027])
  })

  describe('when listings is empty', () => {
    it('returns an empty array', () => {
      assert.deepStrictEqual(collectYearsWithEvents([]), [])
    })
  })
})
