/** Identifying pair for one season within the seasonal hierarchy — `seasonalYear` plus `season`. */
interface SeasonKey {
  /** Seasonal year the season belongs to (e.g. `2026`). */
  seasonalYear: number
  /** Season ordinal within `seasonalYear` (e.g. `1` for spring). */
  season: number
}

export default SeasonKey
