/** A specific season's place on the calendar — the (year, season-within-year) coordinate. */
interface SeasonalSlot {
  /** Seasonal year the slot belongs to (e.g. `2026`). */
  seasonalYear: number
  /** Season within `seasonalYear` (`0` winter, `1` spring, `2` summer, `3` fall). */
  season: number
}

export default SeasonalSlot
