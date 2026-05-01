import type EventSlot from './event-slot.js'

/** Parsed event metadata — the structured, camelCase form of an event's frontmatter-encoded fields. */
interface ParsedEventMeta extends EventSlot {
  /** ISO 8601 date marking the start (inclusive). */
  startDate: string
  /** ISO 8601 date marking the end (inclusive); equals `startDate` for single-day events. */
  endDate: string
}

export default ParsedEventMeta
