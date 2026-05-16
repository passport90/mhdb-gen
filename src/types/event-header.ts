import type EventSlot from './event-slot.js'

/**
 * Event-header projection used by sync decision-side services
 * (`findEventIdsToRender`, `pruneOrphanOutput`) — identifiers, slot coordinates, the
 * pre-derived URL slug, and sync-state timestamps. The slug is computed once in the sync
 * controller from the title on the underlying `EventHeaderRow`, so downstream consumers
 * never need to know about slugify.
 */
interface EventHeader extends EventSlot {
  /** Surrogate primary key from the `events` table. */
  id: number
  /** URL slug derived from the underlying row's title via `slugify`; pre-computed by the controller. */
  slug: string
  /** Last sync render timestamp, or `null` when the row has never been rendered. */
  renderedAt: string | null
  /** Last content-column modification timestamp, maintained by the `events_update_timestamp` trigger. */
  updatedAt: string
}

export default EventHeader
