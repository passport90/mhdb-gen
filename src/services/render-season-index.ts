import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import type SeasonIndexSource from '../types/season-index-source.js'
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
  /** Season-index source data derived from listings in one cursor pass. */
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
 * Compares two slots in `(year, season)` lex order. Returns only the sign — never the
 * arithmetic difference — so the result cannot be mistaken for a year delta or a season
 * delta depending on which dimension differentiated the inputs.
 *
 * @param a - First slot.
 * @param b - Second slot.
 * @returns `-1` when `a` precedes `b`, `0` when equal, `1` when `a` follows.
 */
const compareSlots = (a: SeasonalSlot, b: SeasonalSlot): -1 | 0 | 1 => {
  if (a.seasonalYear !== b.seasonalYear) return a.seasonalYear < b.seasonalYear ? -1 : 1
  if (a.season !== b.season) return a.season < b.season ? -1 : 1

  return 0
}

/**
 * Walks `listings` once and harvests every piece of data the season-index render needs:
 * events in `slot` (in position order) and the closest earlier and later slots with events.
 * Relies on `listings` being sorted by `(seasonal_year, season, position)`; the pass
 * terminates as soon as the first post-target listing is seen.
 *
 * @param listings - Snapshot of every event listing, ordered as above.
 * @param slot - Target slot whose source is being derived.
 * @returns Season-index source — the slot, events in it, and prev/next slot neighbors.
 */
const deriveSeasonIndexSource = (
  listings: EventListing[],
  slot: SeasonalSlot,
): SeasonIndexSource => {
  /** Closest earlier slot with events, or `null` when no listing precedes the target. */
  let prevSlot: SeasonalSlot | null = null

  /** Events in the target slot, in position order. */
  const eventsInSlot: EventListing[] = []

  /** Cursor into `listings`; advanced through the pre-target and target phases. */
  let index = 0

  while (index < listings.length && compareSlots(listings[index], slot) < 0) {
    prevSlot = { seasonalYear: listings[index].seasonalYear, season: listings[index].season }
    index++
  }

  while (index < listings.length && compareSlots(listings[index], slot) === 0) {
    eventsInSlot.push(listings[index])
    index++
  }

  /** First listing strictly after the target slot, or `undefined` past the listings end. */
  const nextListing = listings[index]

  /** Slot of `nextListing`, or `null` when there is no listing past the target. */
  const nextSlot: SeasonalSlot | null = nextListing
    ? { seasonalYear: nextListing.seasonalYear, season: nextListing.season }
    : null

  return { slot, eventsInSlot, prevSlot, nextSlot }
}

export default renderSeasonIndex
