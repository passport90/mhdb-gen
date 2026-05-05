import type EventPageViewModel from '../types/event-page-view-model.js'
import type EventToRender from '../types/event-to-render.js'

/**
 * Projects a hydrated event plus its in-season neighbors into the view model the eta template consumes
 * — resolves paths, labels, the date range, the rendered description HTML, and the prev/next links.
 *
 * @param event - Event being rendered.
 * @param prevEvent - Previous event in the same season, or `null` at the start of the season.
 * @param nextEvent - Next event in the same season, or `null` at the end of the season.
 * @returns View model ready for `buildEventPage`.
 */
const buildEventViewModel = (
  event: EventToRender,
  prevEvent: EventToRender | null,
  nextEvent: EventToRender | null,
): EventPageViewModel => {
  void event
  void prevEvent
  void nextEvent

  throw new Error('buildEventViewModel: not yet implemented')
}

export default buildEventViewModel
