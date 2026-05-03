import type EventToRender from '../types/event-to-render.js'

/**
 * Writes the event's HTML page to `<outputDir>/<year>/<season>/<slug>/index.html`, copying the
 * illustration alongside it when the event has one.
 *
 * @param event - Event to render.
 * @param outputDir - Output root.
 */
const renderEvent = (event: EventToRender, outputDir: string): void => {
  void event
  void outputDir

  throw new Error('renderEvent: not yet implemented')
}

export default renderEvent
