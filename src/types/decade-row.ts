import type YearLink from './year-link.js'

/** One row of the decade-by-year matrix on the root index page. */
interface DecadeRow {
  /** Decade label shown in the row header, e.g. `1060s`. */
  decadeLabel: string
  /** Ten cells representing years 0–9 within the decade; `null` when the year has no events. */
  yearLinks: (YearLink | null)[]
}

export default DecadeRow
