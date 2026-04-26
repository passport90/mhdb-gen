/** Parsed event metadata — the structured, camelCase form of an event's frontmatter-encoded fields. */
interface ParsedEventMeta {
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
}

export default ParsedEventMeta
