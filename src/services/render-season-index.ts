import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import buildSeasonIndexPage from '../presenters/build-season-index-page.js'
import buildSeasonIndexViewModel from '../presenters/build-season-index-view-model.js'
import { join } from 'node:path'

/**
 * Renders the slot's index page at
 * `<outputDirPath>/<year>/<season-int>-<season-name>/index.html` when the slot has events.
 * No-ops when the slot is empty in `listings` — `pruneOrphanOutput` has already removed the
 * directory and its stale index, and the renderer declines to recreate it.
 *
 * @param outputDirPath - Output root.
 * @param slot - Seasonal slot whose index page is being rendered.
 * @param listings - Snapshot of every event listing; the timeline and prev/next slot links
 *   are derived from it in memory.
 */
const renderSeasonIndex = (
  outputDirPath: string,
  slot: SeasonalSlot,
  listings: EventListing[],
): void => {
  /** Listings filtered to events in this slot, preserving the input's position order. */
  const eventsInSlot = listings.filter(listing => isSameSlot(listing, slot))
  if (eventsInSlot.length === 0) return

  /** Distinct slots with events, in `(year, season)` ascending order. */
  const distinctSlots = collectDistinctSlots(listings)
  /** Position of `slot` within `distinctSlots`. */
  const slotIndex = distinctSlots.findIndex(candidateSlot => isSameSlot(candidateSlot, slot))
  /** Closest earlier slot with events, or `null` when `slot` is the earliest. */
  const prevSlot = slotIndex > 0 ? distinctSlots[slotIndex - 1] : null
  /** Closest later slot with events, or `null` when `slot` is the latest. */
  const nextSlot = slotIndex < distinctSlots.length - 1 ? distinctSlots[slotIndex + 1] : null
  /** View model assembled from the derived data. */
  const viewModel = buildSeasonIndexViewModel(slot, eventsInSlot, prevSlot, nextSlot)
  /** Rendered HTML for the season index page. */
  const html = buildSeasonIndexPage(viewModel)

  /** Season directory under the output root. */
  const seasonDirPath = join(outputDirPath, String(slot.seasonalYear), SEASON_PATH_SEGMENTS[slot.season])

  mkdirSync(seasonDirPath, { recursive: true })
  writeFileSync(join(seasonDirPath, 'index.html'), html)
}

/**
 * Collects the distinct `(year, season)` slots present in `listings`, in `(year, season)`
 * ascending order. Relies on `listings` being sorted by `(seasonal_year, season, position)` so
 * a single dedup pass yields the right order.
 *
 * @param listings - Snapshot of every event listing.
 * @returns Distinct slots ascending; empty when `listings` is empty.
 */
const collectDistinctSlots = (listings: EventListing[]): SeasonalSlot[] => {
  /** Slots accumulated so far, in encounter (and therefore ascending) order. */
  const slots: SeasonalSlot[] = []

  /** Last slot appended; tracks the dedup boundary across the pass. */
  let lastSlot: SeasonalSlot | null = null

  for (const listing of listings) {
    /** Slot extracted from this listing for accumulation. */
    const slot: SeasonalSlot = { seasonalYear: listing.seasonalYear, season: listing.season }
    if (lastSlot !== null && isSameSlot(lastSlot, slot)) continue

    slots.push(slot)
    lastSlot = slot
  }

  return slots
}

/**
 * Reports whether two seasonal slots refer to the same `(year, season)` pair. Any object
 * carrying `seasonalYear` and `season` qualifies — `EventListing` and `SeasonalSlot` both fit.
 *
 * @param a - First slot.
 * @param b - Second slot.
 * @returns `true` when both share the same `seasonalYear` and `season`.
 */
const isSameSlot = (a: SeasonalSlot, b: SeasonalSlot): boolean =>
  a.seasonalYear === b.seasonalYear && a.season === b.season

export default renderSeasonIndex
