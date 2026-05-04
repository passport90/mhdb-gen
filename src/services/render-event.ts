import type EventToRender from '../types/event-to-render.js'

/**
 * Writes the event's HTML page to `<outputDirPath>/<year>/<season>/<slug>/index.html`, copying the
 * illustration alongside it when the event has one.
 *
 * @param event - Event to render.
 * @param outputDirPath - Output root.
 */
const renderEvent = (event: EventToRender, outputDirPath: string): void => {
  void event
  void outputDirPath

  throw new Error('renderEvent: not yet implemented')
}

export default renderEvent
