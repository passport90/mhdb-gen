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
  /** Row hydrated from `events`; SQL aliases match the type's camelCase keys. */
  const row = db.prepare(`
    SELECT
      id,
      slug,
      title,
      description,
      illustration_hash AS illustrationHash,
      start_date AS startDate,
      end_date AS endDate,
      seasonal_year AS seasonalYear,
      season,
      position
    FROM events
    WHERE id = ?
  `).get(id)

  return {
    id: row?.id,
    slug: row?.slug,
    title: row?.title,
    description: row?.description,
    illustrationHash: row?.illustrationHash,
    startDate: row?.startDate,
    endDate: row?.endDate,
    seasonalYear: row?.seasonalYear,
    season: row?.season,
    position: row?.position,
  } as EventToRender
}

export default findEventById
