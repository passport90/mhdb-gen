import type EventPageViewModel from '../types/event-page-view-model.js'

/**
 * Applies the eta event template to the view model.
 *
 * @param viewModel - Pre-resolved view model — paths, labels, rendered HTML already in place.
 * @returns Full HTML document for the event's page.
 */
const buildEventPage = (viewModel: EventPageViewModel): string => {
  void viewModel

  throw new Error('buildEventPage: not yet implemented')
}

export default buildEventPage
