import type { DatabaseSync } from 'node:sqlite'
import type EventBody from '../types/event-body.js'

/**
 * Hydrates the heavy body fields of a single event row — title, description,
 * illustration hash, and the date range. The caller already holds the identifying tuple
 * (id, slot, slug, updatedAt) via the upstream `EventListing`, so those columns are
 * deliberately not re-selected; combining the two produces an `EventToRender`.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param id - Surrogate primary key of the event row.
 * @returns The hydrated body fields for the row.
 */
const findEventBodyById = (db: DatabaseSync, id: number): EventBody => {
  /** Row hydrated from `events`; SQL aliases match the type's camelCase keys. */
  const row = db.prepare(`
    SELECT
      title,
      description,
      illustration_hash AS illustrationHash,
      start_date AS startDate,
      end_date AS endDate
    FROM events
    WHERE id = ?
  `).get(id)

  return {
    title: row?.title,
    description: row?.description,
    illustrationHash: row?.illustrationHash,
    startDate: row?.startDate,
    endDate: row?.endDate,
  } as EventBody
}

export default findEventBodyById
