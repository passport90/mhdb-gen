import type SeasonalSlot from './seasonal-slot.js'

/**
 * Skinny per-event row used by the controller for decision-side calls — the columnar
 * fields needed to identify the row, locate its on-disk directory, and reason about
 * staleness. The header/body split mirrors `EventToRender`: this is the header,
 * `EventToRender` is header + body merged for the render loop.
 */
interface EventHeader extends SeasonalSlot {
  /** Surrogate primary key of the event row. */
  id: number
  /** URL slug; identifies the on-disk output directory for the row. */
  slug: string
  /** Last sync render timestamp, or `null` when the row has never been rendered. */
  renderedAt: string | null
  /** Last content-column modification timestamp, maintained by the `events_update_timestamp` trigger. */
  updatedAt: string
}

export default EventHeader
