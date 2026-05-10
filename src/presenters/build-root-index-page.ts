import type DecadeRow from '../types/decade-row.js'
import ETA_ENGINE from './eta-engine.js'

/**
 * Applies the eta root-index template to the decade-by-year matrix.
 *
 * @param decadeRows - Decade rows in ascending order; empty for the no-events page.
 * @returns Full HTML document for the root `index.html` page.
 */
const buildRootIndexPage = (decadeRows: DecadeRow[]): string =>
  ETA_ENGINE.render('root-index', decadeRows)

export default buildRootIndexPage
