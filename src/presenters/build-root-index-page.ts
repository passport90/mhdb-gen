/**
 * Applies the eta root-index template to the view model. Hollow; takes the view model opaquely
 * via `unknown` until `buildRootIndexViewModel` defines the shape.
 *
 * @param viewModel - Pre-resolved view model produced by `buildRootIndexViewModel`.
 * @returns Full HTML document for the root `index.html` page.
 */
const buildRootIndexPage = (viewModel: unknown): string => {
  void viewModel

  throw new Error('buildRootIndexPage: not yet implemented')
}

export default buildRootIndexPage
