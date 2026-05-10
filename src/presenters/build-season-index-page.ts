/**
 * Applies the eta season-index template to the view model. Hollow; takes the view model opaquely
 * via `unknown` until `buildSeasonIndexViewModel` defines the shape.
 *
 * @param viewModel - Pre-resolved view model produced by `buildSeasonIndexViewModel`.
 * @returns Full HTML document for the season's `index.html` page.
 */
const buildSeasonIndexPage = (viewModel: unknown): string => {
  void viewModel

  throw new Error('buildSeasonIndexPage: not yet implemented')
}

export default buildSeasonIndexPage
