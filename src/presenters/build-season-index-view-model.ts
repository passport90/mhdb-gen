import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Projects the slot, its events, and adjacent slots into the season-index view model. Hollow until
 * the type and implementation are designed; flows through the chain via `unknown`.
 *
 * @param slot - Seasonal slot of the page.
 * @param events - Events in the slot, in position order.
 * @param prevSlot - Previous slot with events, or `null` when none.
 * @param nextSlot - Next slot with events, or `null` when none.
 * @returns View model ready for `buildSeasonIndexPage`.
 */
const buildSeasonIndexViewModel = (
  slot: SeasonalSlot,
  events: unknown[],
  prevSlot: SeasonalSlot | null,
  nextSlot: SeasonalSlot | null,
): unknown => {
  void slot
  void events
  void prevSlot
  void nextSlot

  throw new Error('buildSeasonIndexViewModel: not yet implemented')
}

export default buildSeasonIndexViewModel
