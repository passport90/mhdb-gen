import type { DatabaseSync } from 'node:sqlite'
import type EventRow from '../types/event-row.js'

/**
 * Hydrates a single event row from the database. Called per-event by the sync render loop
 * so heavy authored fields (description, illustration hash) only live in memory for the
 * lifetime of one render iteration. The caller wraps the result into `EventToRender` by
 * adding the pre-derived slug.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param id - Surrogate primary key of the event row.
 * @returns The hydrated event row.
 */
const findEventById = (db: DatabaseSync, id: number): EventRow => {
  /** Row hydrated from `events`; SQL aliases match the type's camelCase keys. */
  const row = db.prepare(`
    SELECT
      id,
      title,
      description,
      illustration_hash AS illustrationHash,
      start_date AS startDate,
      end_date AS endDate,
      seasonal_year AS seasonalYear,
      season,
      position,
      updated_at AS updatedAt
    FROM events
    WHERE id = ?
  `).get(id)

  return {
    id: row?.id,
    title: row?.title,
    description: row?.description,
    illustrationHash: row?.illustrationHash,
    startDate: row?.startDate,
    endDate: row?.endDate,
    seasonalYear: row?.seasonalYear,
    season: row?.season,
    position: row?.position,
    updatedAt: row?.updatedAt,
  } as EventRow
}

export default findEventById
