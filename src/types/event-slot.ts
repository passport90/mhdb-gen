import type SeasonalSlot from './seasonal-slot.js'

/** Identifying tuple for an event row — the unique key under the `unique_slot` constraint. */
interface EventSlot extends SeasonalSlot {
  /** Position of the event within the season. */
  position: number
}

export default EventSlot
