import type EventRow from './event-row.js'

/**
 * Event row materialized for rendering — the raw row from the database, plus the pre-derived
 * URL slug. The service layer wraps an `EventRow` into this shape via
 * `{ ...row, slug: slugify(row.title) }` so consumers can build URLs without knowing about
 * the derivation.
 */
interface EventToRender extends EventRow {
  /** URL slug derived from `title` via `slugify`; pre-computed by the service wrapper. */
  slug: string
}

export default EventToRender
