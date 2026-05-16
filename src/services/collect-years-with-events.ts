import type EventListing from '../types/event-listing.js'

/**
 * Collects the distinct seasonal years present in `listings`, in ascending order. Relies on
 * the input being sorted by `(seasonal_year, season, position)` — the contract of
 * `findAllEventListings` — so a single dedup pass yields the right order.
 *
 * @param listings - Snapshot of every event listing, ordered as above.
 * @returns Years with at least one event, ascending; empty when `listings` is empty.
 */
const collectYearsWithEvents = (listings: EventListing[]): number[] => {
  /** Years accumulated so far, in encounter (and therefore ascending) order. */
  const years: number[] = []

  /** Last year appended; tracks the dedup boundary across the pass. */
  let lastYear: number | null = null

  for (const listing of listings) {
    if (listing.seasonalYear === lastYear) continue
    years.push(listing.seasonalYear)
    lastYear = listing.seasonalYear
  }

  return years
}

export default collectYearsWithEvents
