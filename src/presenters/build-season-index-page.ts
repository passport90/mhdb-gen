import type SeasonIndexPageViewModel from '../types/season-index-page-view-model.js'

/**
 * Applies the eta season-index template to the view model.
 *
 * @param viewModel - Pre-resolved view model produced by `buildSeasonIndexViewModel`.
 * @returns Full HTML document for the season's `index.html` page.
 */
const buildSeasonIndexPage = (viewModel: SeasonIndexPageViewModel): string => {
  void viewModel

  throw new Error('buildSeasonIndexPage: not yet implemented')
}

export default buildSeasonIndexPage
