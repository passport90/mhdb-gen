import type EventSlot from './event-slot.js'

/**
 * Raw event-listing row hydrated from the database — identifiers, slot coordinates,
 * sync-state timestamps, and the title. Returned by `findAllEventListings`; lifted to
 * `EventListing` by the caller (which replaces title with the derived slug).
 */
interface EventListingRow extends EventSlot {
  /** Surrogate primary key from the `events` table. */
  id: number
  /** Display title, lifted from the markdown H1; consumed by the caller to derive the slug. */
  title: string
  /** Last sync render timestamp, or `null` when the row has never been rendered. */
  renderedAt: string | null
  /** Last content-column modification timestamp, maintained by the `events_update_timestamp` trigger. */
  updatedAt: string
}

export default EventListingRow
