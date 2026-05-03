import type ParsedEvent from './parsed-event.js'

/** Event row materialized for rendering — the parsed authored fields plus the DB-side fields the renderer needs. */
interface EventToRender extends ParsedEvent {
  /** Surrogate primary key from the `events` table; used by `markRendered`. */
  id: number
  /** URL slug, unique within the `events` table. */
  slug: string
  /** Hex SHA-256 of the illustration; `null` when the event has no illustration. */
  illustrationHash: string | null
}

export default EventToRender
