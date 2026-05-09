import type DecadeRow from '../types/decade-row.js'
import type YearLink from '../types/year-link.js'

/** Number of year cells per decade row in the matrix. */
const YEAR_COUNT_PER_DECADE = 10

/**
 * Groups a list of years-with-events into decade rows, filling each row's 10 cells with either a
 * year link or `null` when that year has no events.
 *
 * @param years - Distinct seasonal years in ascending order.
 * @returns Decade rows in ascending order; empty when `years` is empty.
 */
const buildDecadeRows = (years: number[]): DecadeRow[] => {
  /** Years that have events; lookup for cell occupancy. */
  const yearWithEventsSet = new Set(years)
  /** Distinct decades covering every year. */
  const distinctDecadeSet = new Set(years.map(floorYearToDecade))
  /** Distinct decades sorted ascending. */
  const decadesAscending = [...distinctDecadeSet].sort((leftDecade, rightDecade) => leftDecade - rightDecade)

  return decadesAscending.map((decade) => ({
    decadeLabel: `${decade}s`,
    yearLinks: buildYearLinksForDecade(decade, yearWithEventsSet),
  }))
}

/**
 * Builds the 10 cells for a decade row — one per year-within-decade.
 *
 * @param decade - First year of the decade, e.g. `1060`.
 * @param yearWithEventsSet - Lookup of years that have at least one event.
 * @returns Ten cells; `null` for years not in `yearWithEventsSet`.
 */
const buildYearLinksForDecade = (decade: number, yearWithEventsSet: Set<number>): (YearLink | null)[] =>
  Array.from({ length: YEAR_COUNT_PER_DECADE }, (_unused, indexInDecade) => {
    /** Year represented by this cell. */
    const year = decade + indexInDecade
    if (!yearWithEventsSet.has(year)) return null

    return { label: String(year), indexPagePath: `${year}/index.html` }
  })

/**
 * Floors `year` to the start of its decade — e.g. `1066` → `1060`.
 *
 * @param year - Calendar year.
 * @returns First year of the decade containing `year`.
 */
const floorYearToDecade = (year: number): number => Math.floor(year / YEAR_COUNT_PER_DECADE) * YEAR_COUNT_PER_DECADE

export default buildDecadeRows
