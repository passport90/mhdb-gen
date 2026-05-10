import ETA_ENGINE from './eta-engine.js'
import type SeasonIndexPageViewModel from '../types/season-index-page-view-model.js'

/**
 * Applies the eta season-index template to the view model.
 *
 * @param viewModel - Pre-resolved view model — labels, timeline entries, and links already in place.
 * @returns Full HTML document for the season's `index.html` page.
 */
const buildSeasonIndexPage = (viewModel: SeasonIndexPageViewModel): string =>
  ETA_ENGINE.render('season-index', viewModel)

export default buildSeasonIndexPage
