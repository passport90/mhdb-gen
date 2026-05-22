import { describe, it } from 'node:test'
import type EventListing from '../../src/types/event-listing.js'
import assert from 'node:assert/strict'
import compareListingToYear from '../../src/services/compare-listing-to-year.js'

describe('compareListingToYear', () => {
  /** Builds an event listing in `seasonalYear`; only the year is read by the comparator. */
  const listingInYear = (seasonalYear: number): EventListing => ({
    id: 1,
    title: 'Event',
    slug: 'event',
    startDate: '1066-01-01',
    endDate: '1066-01-02',
    seasonalYear,
    season: 0,
    position: 1,
    renderedAt: null,
    updatedAt: '1066-01-01 00:00:00',
  })

  it('returns -1 when the listing\'s year is earlier than the target', () => {
    assert.strictEqual(compareListingToYear(listingInYear(1066), 2026), -1)
  })

  it('returns 1 when the listing\'s year is later than the target', () => {
    assert.strictEqual(compareListingToYear(listingInYear(2026), 1066), 1)
  })

  it('returns 0 when the listing\'s year matches the target', () => {
    assert.strictEqual(compareListingToYear(listingInYear(1066), 1066), 0)
  })
})
