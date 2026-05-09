/**
 * Projects the years-with-events list into the root-index view model. Hollow until the type and
 * implementation are designed; for now flows opaque through the chain via `unknown`.
 *
 * @param years - Distinct seasonal years in ascending order.
 * @returns View model ready for `buildRootIndexPage`.
 */
const buildRootIndexViewModel = (years: number[]): unknown => {
  void years

  throw new Error('buildRootIndexViewModel: not yet implemented')
}

export default buildRootIndexViewModel
