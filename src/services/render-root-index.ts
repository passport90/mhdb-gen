import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import buildDecadeRows from '../presenters/build-decade-rows.js'
import buildRootIndexPage from '../presenters/build-root-index-page.js'
import findYearsWithEvents from '../repositories/find-years-with-events.js'
import { join } from 'node:path'

/**
 * Re-renders the root `index.html` page that lists every year with at least one event. Writes the
 * page to `<outputDirPath>/index.html`, creating the output directory if missing.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 */
const renderRootIndex = (
  db: DatabaseSync,
  outputDirPath: string,
): void => {
  /** Years with at least one event, ascending. */
  const years = findYearsWithEvents(db)
  /** Decade-by-year matrix produced from `years`. */
  const decadeRows = buildDecadeRows(years)
  /** Rendered HTML for the root index page. */
  const html = buildRootIndexPage(decadeRows)

  mkdirSync(outputDirPath, { recursive: true })
  writeFileSync(join(outputDirPath, 'index.html'), html)
}

export default renderRootIndex
