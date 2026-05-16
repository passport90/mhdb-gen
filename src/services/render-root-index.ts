import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import buildDecadeRows from '../presenters/build-decade-rows.js'
import buildRootIndexPage from '../presenters/build-root-index-page.js'
import collectYearsWithEvents from './collect-years-with-events.js'
import { join } from 'node:path'

/**
 * Re-renders the root `index.html` page that lists every year with at least one event. Writes the
 * page to `<outputDirPath>/index.html`, creating the output directory if missing.
 *
 * @param outputDirPath - Output root.
 * @param listings - Snapshot of every event listing; the distinct-years matrix is derived from it.
 */
const renderRootIndex = (outputDirPath: string, listings: EventListing[]): void => {
  /** Years with at least one event, ascending. */
  const years = collectYearsWithEvents(listings)
  /** Decade-by-year matrix produced from `years`. */
  const decadeRows = buildDecadeRows(years)
  /** Rendered HTML for the root index page. */
  const html = buildRootIndexPage(decadeRows)

  mkdirSync(outputDirPath, { recursive: true })
  writeFileSync(join(outputDirPath, 'index.html'), html)
}

export default renderRootIndex
