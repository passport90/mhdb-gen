import type EventKeyBundle from './event-key-bundle.js'
import type SeasonalSlot from './seasonal-slot.js'

/** Event-row projection carrying identifiers, seasonal coordinates, and sync-state timestamps — no authored content. */
interface EventHeader extends EventKeyBundle, SeasonalSlot {
  /** Last sync render timestamp, or `null` when the row has never been rendered. */
  renderedAt: string | null
  /** Last content-column modification timestamp, maintained by the `events_update_timestamp` trigger. */
  updatedAt: string
}

export default EventHeader
