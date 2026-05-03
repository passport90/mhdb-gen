import type SeasonKey from './season-key.js'

/** Identifying tuple for an event row — the unique key under the `unique_slot` constraint. */
interface EventSlot extends SeasonKey {
  /** Position of the event within the season. */
  position: number
}

export default EventSlot
