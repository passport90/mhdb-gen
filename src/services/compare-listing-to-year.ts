import type EventListing from '../types/event-listing.js'
import compareNumbers from '../helpers/compare-numbers.js'

/**
 * Asymmetric comparator pairing a listing's year with a target year. Lets `findLowerBound`
 * binary-search a sorted `EventListing[]` by year without materialising an intermediate
 * years-only array.
 *
 * @param listing - Listing whose year is the left-hand side of the comparison.
 * @param year - Target year being searched for.
 * @returns `-1` when the listing's year precedes `year`, `1` when it follows, `0` when equal.
 */
const compareListingToYear = (listing: EventListing, year: number): -1 | 0 | 1 =>
  compareNumbers(listing.seasonalYear, year)

export default compareListingToYear
