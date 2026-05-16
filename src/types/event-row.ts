import type ParsedEvent from './parsed-event.js'

/**
 * Raw event row hydrated from the database — the parsed authored fields plus the DB-side
 * fields the renderer needs. Returned by `findEventById`; lifted to `EventToRender` by the
 * caller (which adds the pre-derived `slug`).
 */
interface EventRow extends ParsedEvent {
  /** Surrogate primary key from the `events` table. */
  id: number
  /** Hex SHA-256 of the illustration; `null` when the event has no illustration. */
  illustrationHash: string | null
  /** SQLite `datetime('now')` stamp of the row's last content change; bumped by the `events_updated_at` trigger. */
  updatedAt: string
}

export default EventRow
