import type EventListingRow from './event-listing-row.js'

/**
 * Per-event data threaded through the sync run — every field on `EventListingRow`
 * plus the URL slug derived from the row's title by the sync controller's
 * `hydrateListing`. Consumed by every decision-side and listing-side service
 * (`findEventsToRender`, `pruneOrphanOutput`, `renderEvents`, `renderSeasonIndex`).
 */
interface EventListing extends EventListingRow {
  /** URL slug derived from `title` via `slugify`; pre-computed by the controller. */
  slug: string
}

export default EventListing
