import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import type TimelineEvent from '../types/timeline-event.js'
import type TimelineEventRow from '../types/timeline-event-row.js'
import buildSeasonIndexPage from '../presenters/build-season-index-page.js'
import buildSeasonIndexViewModel from '../presenters/build-season-index-view-model.js'
import findEventsInSeason from '../repositories/find-events-in-season.js'
import findNextSeasonWithEvents from '../repositories/find-next-season-with-events.js'
import findPrevSeasonWithEvents from '../repositories/find-prev-season-with-events.js'
import { join } from 'node:path'
import slugify from '../helpers/slugify.js'

/**
 * Renders the slot's index page at
 * `<outputDirPath>/<year>/<season-int>-<season-name>/index.html` when the slot has events.
 * No-ops when the slot is empty in the DB — `pruneOrphanOutput` has already removed the directory
 * and its stale index, and the renderer declines to recreate it.
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
  /** Raw event rows in the slot, in position order. */
  const eventRows = findEventsInSeason(db, slot.seasonalYear, slot.season)
  if (eventRows.length === 0) return

  /** Timeline events with pre-derived slugs, ready for the view-model builder. */
  const events = eventRows.map(hydrateTimelineEvent)
  /** Closest earlier slot with events, or `null` when this is the earliest. */
  const prevSlot = findPrevSeasonWithEvents(db, slot.seasonalYear, slot.season)
  /** Closest later slot with events, or `null` when this is the latest. */
  const nextSlot = findNextSeasonWithEvents(db, slot.seasonalYear, slot.season)
  /** View model assembled from the queried data. */
  const viewModel = buildSeasonIndexViewModel(slot, events, prevSlot, nextSlot)
  /** Rendered HTML for the season index page. */
  const html = buildSeasonIndexPage(viewModel)

  /** Season directory under the output root. */
  const seasonDirPath = join(outputDirPath, String(slot.seasonalYear), SEASON_PATH_SEGMENTS[slot.season])

  mkdirSync(seasonDirPath, { recursive: true })
  writeFileSync(join(seasonDirPath, 'index.html'), html)
}

/**
 * Wraps a raw `TimelineEventRow` into a `TimelineEvent` by deriving the URL slug from the title.
 * Keeps the slug-derivation seam at the service boundary so the repo stays SQL-only.
 *
 * @param row - Raw timeline row from `findEventsInSeason`.
 * @returns Timeline event with the pre-derived slug field.
 */
const hydrateTimelineEvent = (row: TimelineEventRow): TimelineEvent =>
  ({ ...row, slug: slugify(row.title) })

export default renderSeasonIndex
