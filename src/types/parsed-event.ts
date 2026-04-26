/** Event data extracted from a markdown source file, before slug derivation and persistence. */
interface ParsedEvent {
  /** Seasonal year the event belongs to (e.g. `2026`). */
  seasonalYear: number
  /** Season ordinal within the year (e.g. `1` for spring). */
  season: number
  /** Position of the event within the season. */
  position: number
  /** ISO 8601 date marking the start (inclusive). */
  startDate: string
  /** ISO 8601 date marking the end (inclusive); equals `startDate` for single-day events. */
  endDate: string
  /** Event title, lifted from the body's H1. */
  title: string
  /** Body verbatim (markdown), with the H1 line stripped. */
  description: string
}

export default ParsedEvent
