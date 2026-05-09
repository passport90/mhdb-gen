import type DecadeRow from '../types/decade-row.js'

/**
 * Applies the eta root-index template to the decade-by-year matrix.
 *
 * @param decadeRows - Decade rows in ascending order; empty for the no-events page.
 * @returns Full HTML document for the root `index.html` page.
 */
const buildRootIndexPage = (decadeRows: DecadeRow[]): string => {
  void decadeRows

  throw new Error('buildRootIndexPage: not yet implemented')
}

export default buildRootIndexPage
