/**
 * Year-index render input bundle — the target year and the seasons in it with at least one
 * event. Derived from sync listings by `deriveYearIndexSource` in one cursor pass; consumed
 * by `renderYearIndex` to short-circuit empty years and by `buildYearIndexViewModel` to
 * build the year-page projection.
 */
interface YearIndexSource {
  /** Seasonal year this source describes. */
  year: number

  /** Season numbers (0–3) in `year` with at least one event, ascending. */
  seasonsInYear: number[]
}

export default YearIndexSource
