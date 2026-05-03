import type { DatabaseSync } from 'node:sqlite'
import type EventToRender from '../types/event-to-render.js'

/**
 * Returns events whose output is stale or missing on disk — those with `rendered_at IS NULL`,
 * `rendered_at != updated_at`, or no `<outputDir>/<year>/<season>/<slug>/` folder.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root used to check folder presence.
 * @returns Events ready to be rendered.
 */
const findEventsToRender = (db: DatabaseSync, outputDir: string): EventToRender[] => {
  void db
  void outputDir

  throw new Error('findEventsToRender: not yet implemented')
}

export default findEventsToRender
