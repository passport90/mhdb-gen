import type { DatabaseSync } from 'node:sqlite'
import type EventHeader from '../types/event-header.js'

/**
 * Returns the skinny per-event identifying tuple plus the raw timestamps the controller
 * uses to decide staleness. The staleness predicate itself lives in
 * `findEventIdsToRender`; this repo is column shipping only.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @returns Every event's header, ordered by `(seasonal_year, season, position)` ascending.
 */
const findAllEventHeaders = (db: DatabaseSync): EventHeader[] => {
  /** Raw rows; SQL aliases match the type's camelCase keys. */
  const rows = db.prepare(`
    SELECT
      id,
      slug,
      seasonal_year AS seasonalYear,
      season,
      position,
      rendered_at AS renderedAt,
      updated_at AS updatedAt
    FROM events
    ORDER BY seasonal_year, season, position
  `).all()

  return rows.map(row => ({
    id: row?.id,
    slug: row?.slug,
    seasonalYear: row?.seasonalYear,
    season: row?.season,
    position: row?.position,
    renderedAt: row?.renderedAt,
    updatedAt: row?.updatedAt,
  })) as EventHeader[]
}

export default findAllEventHeaders
