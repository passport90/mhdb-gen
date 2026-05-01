/** Identifying tuple for an event row — the unique key under the `unique_slot` constraint. */
interface EventSlot {
  /** Seasonal year the event belongs to (e.g. `2026`). */
  seasonalYear: number
  /** Season ordinal within the year (e.g. `1` for spring). */
  season: number
  /** Position of the event within the season. */
  position: number
}

export default EventSlot
