import type EventToRender from '../types/event-to-render.js'

/**
 * Renders the event into a self-contained HTML page string — eta template applied to the event's
 * fields, with the markdown body parsed to HTML.
 *
 * @param event - Event to render.
 * @returns Full HTML document for the event's page.
 */
const buildEventPage = (event: EventToRender): string => {
  void event

  throw new Error('buildEventPage: not yet implemented')
}

export default buildEventPage
