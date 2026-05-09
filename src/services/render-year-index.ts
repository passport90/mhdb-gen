import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import buildYearIndexPage from '../presenters/build-year-index-page.js'
import findNextYearWithEvents from '../repositories/find-next-year-with-events.js'
import findPrevYearWithEvents from '../repositories/find-prev-year-with-events.js'
import findSeasonsWithEventsInYear from '../repositories/find-seasons-with-events-in-year.js'
import { join } from 'node:path'

/**
 * Re-renders the year index page at `<outputDirPath>/<year>/index.html`, listing the seasons that
 * year contains and providing prev/next navigation among years that have events.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 * @param year - Seasonal year whose index page is being refreshed.
 */
const renderYearIndex = (
  db: DatabaseSync,
  outputDirPath: string,
  year: number,
): void => {
  /** Season numbers in `year` that have at least one event. */
  const seasonsWithEvents = findSeasonsWithEventsInYear(db, year)
  /** Closest earlier year with events, or `null` when `year` is the earliest. */
  const prevYear = findPrevYearWithEvents(db, year)
  /** Closest later year with events, or `null` when `year` is the latest. */
  const nextYear = findNextYearWithEvents(db, year)
  /** Rendered HTML for the year index page. */
  const html = buildYearIndexPage({ year, seasonsWithEvents, prevYear, nextYear })

  /** Year directory under the output root. */
  const yearDirPath = join(outputDirPath, String(year))

  mkdirSync(yearDirPath, { recursive: true })
  writeFileSync(join(yearDirPath, 'index.html'), html)
}

export default renderYearIndex
