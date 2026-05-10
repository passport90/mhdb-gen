import { Eta } from 'eta'
import type YearIndexPageViewModel from '../types/year-index-page-view-model.js'
import { fileURLToPath } from 'node:url'

/** Filesystem path to the templates directory; resolved relative to this compiled module. */
const TEMPLATE_DIR_PATH = fileURLToPath(new URL('../templates/', import.meta.url))

/** Eta engine configured to load `.eta` templates from `TEMPLATE_DIR_PATH`. */
const ETA_ENGINE = new Eta({ views: TEMPLATE_DIR_PATH })

/**
 * Applies the eta year-index template to the view model.
 *
 * @param viewModel - Pre-resolved view model — labels, cards, and links already in place.
 * @returns Full HTML document for the year's `index.html` page.
 */
const buildYearIndexPage = (viewModel: YearIndexPageViewModel): string =>
  ETA_ENGINE.render('year-index', viewModel)

export default buildYearIndexPage
