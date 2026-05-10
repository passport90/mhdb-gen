import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import buildYearIndexPage from '../presenters/build-year-index-page.js'
import buildYearIndexViewModel from '../presenters/build-year-index-view-model.js'
import findNextYearWithEvents from '../repositories/find-next-year-with-events.js'
import findPrevYearWithEvents from '../repositories/find-prev-year-with-events.js'
import findSeasonsWithEventsInYear from '../repositories/find-seasons-with-events-in-year.js'
import { join } from 'node:path'

/**
 * Renders the year's index page at `<outputDirPath>/<year>/index.html` when the year has events.
 * No-ops when the year is empty in the DB — `pruneOrphanOutput` has already removed the
 * directory and its stale index, and the renderer declines to recreate it.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 * @param year - Seasonal year whose index page is being rendered.
 */
const renderYearIndex = (
  db: DatabaseSync,
  outputDirPath: string,
  year: number,
): void => {
  /** Season numbers in `year` that have at least one event. */
  const seasonsWithEvents = findSeasonsWithEventsInYear(db, year)
  if (seasonsWithEvents.length === 0) return

  /** Closest earlier year with events, or `null` when `year` is the earliest. */
  const prevYear = findPrevYearWithEvents(db, year)
  /** Closest later year with events, or `null` when `year` is the latest. */
  const nextYear = findNextYearWithEvents(db, year)
  /** View model assembled from the queried data. */
  const viewModel = buildYearIndexViewModel(year, seasonsWithEvents, prevYear, nextYear)
  /** Rendered HTML for the year index page. */
  const html = buildYearIndexPage(viewModel)

  /** Year directory under the output root. */
  const yearDirPath = join(outputDirPath, String(year))

  mkdirSync(yearDirPath, { recursive: true })
  writeFileSync(join(yearDirPath, 'index.html'), html)
}

export default renderYearIndex
