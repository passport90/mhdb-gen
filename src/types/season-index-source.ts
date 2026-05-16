import type EventListing from './event-listing.js'
import type SeasonalSlot from './seasonal-slot.js'

/**
 * Season-index render input bundle — the target slot, the events in it, and the closest
 * earlier and later slots with events. Derived from sync listings by
 * `deriveSeasonIndexSource` in one cursor pass; consumed by `renderSeasonIndex` to
 * short-circuit empty slots and by `buildSeasonIndexViewModel` to build the season-page
 * projection.
 */
interface SeasonIndexSource {
  /** Seasonal slot this source describes. */
  slot: SeasonalSlot

  /** Listings in `slot`, in position order. */
  eventsInSlot: EventListing[]

  /** Closest earlier slot with events, or `null` when `slot` is the earliest. */
  prevSlot: SeasonalSlot | null

  /** Closest later slot with events, or `null` when `slot` is the latest. */
  nextSlot: SeasonalSlot | null
}

export default SeasonIndexSource
