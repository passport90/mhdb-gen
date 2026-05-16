import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import type EventListing from '../types/event-listing.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import buildSeasonIndexPage from '../presenters/build-season-index-page.js'
import buildSeasonIndexViewModel from '../presenters/build-season-index-view-model.js'
import findNextSeasonWithEvents from '../repositories/find-next-season-with-events.js'
import findPrevSeasonWithEvents from '../repositories/find-prev-season-with-events.js'
import { join } from 'node:path'

/**
 * Renders the slot's index page at
 * `<outputDirPath>/<year>/<season-int>-<season-name>/index.html` when the slot has events.
 * No-ops when the slot is empty in `listings` — `pruneOrphanOutput` has already removed the
 * directory and its stale index, and the renderer declines to recreate it.
 *
 * @param db - Database handle; used only for the adjacent-slot lookups.
 * @param outputDirPath - Output root.
 * @param slot - Seasonal slot whose index page is being rendered.
 * @param listings - Snapshot of every event listing; the renderer filters in-memory to the
 *   slot's events, reusing the controller's pre-derived slug rather than re-querying.
 */
const renderSeasonIndex = (
  db: DatabaseSync,
  outputDirPath: string,
  slot: SeasonalSlot,
  listings: EventListing[],
): void => {
  /** Listings filtered to events in this slot, preserving the input's position order. */
  const eventsInSlot = listings.filter(listing => isInSlot(listing, slot))
  if (eventsInSlot.length === 0) return

  /** Closest earlier slot with events, or `null` when this is the earliest. */
  const prevSlot = findPrevSeasonWithEvents(db, slot.seasonalYear, slot.season)
  /** Closest later slot with events, or `null` when this is the latest. */
  const nextSlot = findNextSeasonWithEvents(db, slot.seasonalYear, slot.season)
  /** View model assembled from the queried data. */
  const viewModel = buildSeasonIndexViewModel(slot, eventsInSlot, prevSlot, nextSlot)
  /** Rendered HTML for the season index page. */
  const html = buildSeasonIndexPage(viewModel)

  /** Season directory under the output root. */
  const seasonDirPath = join(outputDirPath, String(slot.seasonalYear), SEASON_PATH_SEGMENTS[slot.season])

  mkdirSync(seasonDirPath, { recursive: true })
  writeFileSync(join(seasonDirPath, 'index.html'), html)
}

/**
 * Reports whether the listing's slot matches the page being rendered — both year and season equal.
 *
 * @param listing - Event listing to test.
 * @param slot - Slot of the page being rendered.
 * @returns `true` when the listing belongs to `slot`.
 */
const isInSlot = (listing: EventListing, slot: SeasonalSlot): boolean =>
  listing.seasonalYear === slot.seasonalYear && listing.season === slot.season

export default renderSeasonIndex
