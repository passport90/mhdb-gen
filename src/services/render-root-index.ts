import { mkdirSync, writeFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import buildRootIndexPage from '../presenters/build-root-index-page.js'
import buildRootIndexViewModel from '../presenters/build-root-index-view-model.js'
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
  /** View model projecting `years` into a template-ready shape. */
  const viewModel = buildRootIndexViewModel(years)
  /** Rendered HTML for the root index page. */
  const html = buildRootIndexPage(viewModel)

  mkdirSync(outputDirPath, { recursive: true })
  writeFileSync(join(outputDirPath, 'index.html'), html)
}

export default renderRootIndex
