import type DecadeRow from '../types/decade-row.js'
import { Eta } from 'eta'
import { fileURLToPath } from 'node:url'

/** Filesystem path to the templates directory; resolved relative to this compiled module. */
const TEMPLATE_DIR_PATH = fileURLToPath(new URL('../templates/', import.meta.url))

/** Eta engine configured to load `.eta` templates from `TEMPLATE_DIR_PATH`. */
const ETA_ENGINE = new Eta({ views: TEMPLATE_DIR_PATH })

/**
 * Applies the eta root-index template to the decade-by-year matrix.
 *
 * @param decadeRows - Decade rows in ascending order; empty for the no-events page.
 * @returns Full HTML document for the root `index.html` page.
 */
const buildRootIndexPage = (decadeRows: DecadeRow[]): string =>
  ETA_ENGINE.render('root-index', decadeRows)

export default buildRootIndexPage
