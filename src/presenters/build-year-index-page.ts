import ETA_ENGINE from './eta-engine.js'
import type YearIndexPageViewModel from '../types/year-index-page-view-model.js'

/**
 * Applies the eta year-index template to the view model.
 *
 * @param viewModel - Pre-resolved view model — labels, cards, and links already in place.
 * @returns Full HTML document for the year's `index.html` page.
 */
const buildYearIndexPage = (viewModel: YearIndexPageViewModel): string =>
  ETA_ENGINE.render('year-index', viewModel)

export default buildYearIndexPage
