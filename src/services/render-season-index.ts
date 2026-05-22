import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import type SeasonIndexSource from '../types/season-index-source.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import buildSeasonIndexPage from '../presenters/build-season-index-page.js'
import buildSeasonIndexViewModel from '../presenters/build-season-index-view-model.js'
import compareSlots from './compare-slots.js'
import findLowerBound from '../helpers/find-lower-bound.js'
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
  /** Season-index source — events in the slot and its prev/next slot neighbors. */
  const source = deriveSeasonIndexSource(listings, slot)

  if (source.eventsInSlot.length === 0) return

  /** View model assembled from the source. */
  const viewModel = buildSeasonIndexViewModel(source)

  /** Rendered HTML for the season index page. */
  const html = buildSeasonIndexPage(viewModel)

  /** Season directory under the output root. */
  const seasonDirPath = join(outputDirPath, String(slot.seasonalYear), SEASON_PATH_SEGMENTS[slot.season])

  mkdirSync(seasonDirPath, { recursive: true })
  writeFileSync(join(seasonDirPath, 'index.html'), html)
}

/**
 * Harvests every piece of data the season-index render needs: the events in `slot` (in
 * position order) and the closest earlier and later slots with events. Binary-searches
 * `listings` for the slot's first event, then walks only that slot — O(log n + events in
 * slot). Relies on `listings` being sorted by `(seasonal_year, season, position)`.
 *
 * @param listings - Snapshot of every event listing, ordered as above.
 * @param slot - Target slot whose source is being derived.
 * @returns Season-index source — the slot, events in it, and prev/next slot neighbors.
 */
const deriveSeasonIndexSource = (
  listings: EventListing[],
  slot: SeasonalSlot,
): SeasonIndexSource => {
  /** Index of the slot's first event, or — when the slot is empty — of the first later event. */
  const firstIndex = findLowerBound(listings, slot, compareSlots)

  /** Listing immediately before `firstIndex`; `undefined` when nothing precedes the slot. */
  const prevListing = listings[firstIndex - 1]

  /** Slot of `prevListing` — the closest earlier slot with events — or `null` when none. */
  const prevSlot: SeasonalSlot | null = prevListing
    ? { seasonalYear: prevListing.seasonalYear, season: prevListing.season }
    : null

  /** Events in the target slot, in position order. */
  const eventsInSlot: EventListing[] = []

  /** Cursor walked forward from `firstIndex` while listings remain in `slot`. */
  let index = firstIndex
  while (index < listings.length && compareSlots(listings[index], slot) === 0) {
    eventsInSlot.push(listings[index])
    index++
  }

  /** First listing strictly after the target slot; `undefined` past the listings end. */
  const nextListing = listings[index]

  /** Slot of `nextListing` — the closest later slot with events — or `null` when none. */
  const nextSlot: SeasonalSlot | null = nextListing
    ? { seasonalYear: nextListing.seasonalYear, season: nextListing.season }
    : null

  return { slot, eventsInSlot, prevSlot, nextSlot }
}

export default renderSeasonIndex
