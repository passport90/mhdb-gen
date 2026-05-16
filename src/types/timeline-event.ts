import type TimelineEventRow from './timeline-event-row.js'

/**
 * Skinny event row used to render an event in a season-index timeline, with the pre-derived
 * URL slug. The service layer wraps a `TimelineEventRow` into this shape via
 * `{ ...row, slug: slugify(row.title) }`.
 */
interface TimelineEvent extends TimelineEventRow {
  /** URL slug derived from `title` via `slugify`; pre-computed by the service wrapper. */
  slug: string
}

export default TimelineEvent
