import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'
import buildSeasonIndexPage from '../presenters/build-season-index-page.js'
import buildSeasonIndexViewModel from '../presenters/build-season-index-view-model.js'
import findEventsInSeason from '../repositories/find-events-in-season.js'
import findNextSeasonWithEvents from '../repositories/find-next-season-with-events.js'
import findPrevSeasonWithEvents from '../repositories/find-prev-season-with-events.js'
import { join } from 'node:path'

/**
 * Renders the slot's index page at `<outputDirPath>/<year>/<season>/index.html` when the slot
 * has events. No-ops when the slot is empty in the DB — `pruneOrphanOutput` has already removed
 * the directory and its stale index, and the renderer declines to recreate it.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 * @param slot - Seasonal slot whose index page is being rendered.
 */
const renderSeasonIndex = (
  db: DatabaseSync,
  outputDirPath: string,
  slot: SeasonalSlot,
): void => {
  /** Events in the slot, in position order. */
  const events = findEventsInSeason(db, slot.seasonalYear, slot.season)
  if (events.length === 0) return

  /** Closest earlier slot with events, or `null` when this is the earliest. */
  const prevSlot = findPrevSeasonWithEvents(db, slot.seasonalYear, slot.season)
  /** Closest later slot with events, or `null` when this is the latest. */
  const nextSlot = findNextSeasonWithEvents(db, slot.seasonalYear, slot.season)
  /** View model assembled from the queried data. */
  const viewModel = buildSeasonIndexViewModel(slot, events, prevSlot, nextSlot)
  /** Rendered HTML for the season index page. */
  const html = buildSeasonIndexPage(viewModel)

  /** Season directory under the output root. */
  const seasonDirPath = join(outputDirPath, String(slot.seasonalYear), String(slot.season))

  mkdirSync(seasonDirPath, { recursive: true })
  writeFileSync(join(seasonDirPath, 'index.html'), html)
}

export default renderSeasonIndex
