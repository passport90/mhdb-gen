/**
 * Result of `findYearNeighborhood` — the seasons in the target year plus the closest
 * earlier and later years with events. Consumed by `renderYearIndex` to short-circuit
 * empty years and by `buildYearIndexViewModel` to build the year-page projection.
 */
interface YearNeighborhood {
  /** Season numbers (0–3) in the target year with at least one event, ascending. */
  seasonsInYear: number[]

  /** Closest earlier year with events, or `null` when the target is the earliest. */
  prevYear: number | null

  /** Closest later year with events, or `null` when the target is the latest. */
  nextYear: number | null
}

export default YearNeighborhood
