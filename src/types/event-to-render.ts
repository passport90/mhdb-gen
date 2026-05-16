import type EventBody from './event-body.js'
import type EventSlot from './event-slot.js'

/**
 * Event materialized for rendering — the body fields from the database combined with the
 * identifying tuple, the pre-derived URL slug, and the row's last-modified timestamp.
 * Produced by the render service by combining an `EventHeader` (slot + id + slug + updatedAt)
 * with an `EventBody` (heavy authored content) fetched by `findEventBodyById`.
 */
interface EventToRender extends EventBody, EventSlot {
  /** Surrogate primary key from the `events` table. */
  id: number
  /** URL slug derived from `title` via `slugify`; carried over from the upstream `EventHeader`. */
  slug: string
  /** SQLite `datetime('now')` stamp of the row's last content change. */
  updatedAt: string
}

export default EventToRender
