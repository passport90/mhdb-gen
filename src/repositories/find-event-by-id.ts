import type { DatabaseSync } from 'node:sqlite'
import type EventToRender from '../types/event-to-render.js'

/**
 * Hydrates a single event row into the renderable shape. Called per-event by the sync
 * render loop so heavy authored fields (description, illustration hash) only live in
 * memory for the lifetime of one render iteration.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param id - Surrogate primary key of the event row.
 * @returns The full renderable event.
 */
const findEventById = (db: DatabaseSync, id: number): EventToRender => {
  void db
  void id

  throw new Error('findEventById: not yet implemented')
}

export default findEventById
