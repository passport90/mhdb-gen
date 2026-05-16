import type { DatabaseSync } from 'node:sqlite'
import type EventListingRow from '../types/event-listing-row.js'

/**
 * Returns the skinny per-event identifying tuple plus the title (raw, for the caller to
 * derive the slug from) and the raw timestamps the controller uses to decide staleness.
 * The staleness predicate itself lives in `findEventsToRender`; this repo is column
 * shipping only.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @returns Every event's row, ordered by `(seasonal_year, season, position)` ascending.
 */
const findAllEventListings = (db: DatabaseSync): EventListingRow[] => {
  /** Raw rows; SQL aliases match the type's camelCase keys. */
  const rows = db.prepare(`
    SELECT
      id,
      title,
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
    title: row?.title,
    seasonalYear: row?.seasonalYear,
    season: row?.season,
    position: row?.position,
    renderedAt: row?.renderedAt,
    updatedAt: row?.updatedAt,
  })) as EventListingRow[]
}

export default findAllEventListings
