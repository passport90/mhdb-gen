import { Eta } from 'eta'
import type SeasonIndexPageViewModel from '../types/season-index-page-view-model.js'
import { fileURLToPath } from 'node:url'

/** Filesystem path to the templates directory; resolved relative to this compiled module. */
const TEMPLATE_DIR_PATH = fileURLToPath(new URL('../templates/', import.meta.url))

/** Eta engine configured to load `.eta` templates from `TEMPLATE_DIR_PATH`. */
const ETA_ENGINE = new Eta({ views: TEMPLATE_DIR_PATH })

/**
 * Applies the eta season-index template to the view model.
 *
 * @param viewModel - Pre-resolved view model — labels, timeline entries, and links already in place.
 * @returns Full HTML document for the season's `index.html` page.
 */
const buildSeasonIndexPage = (viewModel: SeasonIndexPageViewModel): string =>
  ETA_ENGINE.render('season-index', viewModel)

export default buildSeasonIndexPage
