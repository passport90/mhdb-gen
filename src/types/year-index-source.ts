/**
 * Year-index render input bundle — the target year, the seasons in it with at least one
 * event, and the closest earlier and later years with events. Derived from sync listings
 * by `deriveYearIndexSource` in one cursor pass; consumed by `renderYearIndex` to
 * short-circuit empty years and by `buildYearIndexViewModel` to build the year-page
 * projection.
 */
interface YearIndexSource {
  /** Seasonal year this source describes. */
  year: number

  /** Season numbers (0–3) in `year` with at least one event, ascending. */
  seasonsInYear: number[]

  /** Closest earlier year with events, or `null` when `year` is the earliest. */
  prevYear: number | null

  /** Closest later year with events, or `null` when `year` is the latest. */
  nextYear: number | null
}

export default YearIndexSource
