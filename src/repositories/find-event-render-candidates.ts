import type { DatabaseSync } from 'node:sqlite'
import type EventRenderCandidate from '../types/event-render-candidate.js'

/**
 * Returns the skinny per-event identifying tuple plus an `isDbStale` flag computed in
 * SQL as `rendered_at IS NULL OR rendered_at < updated_at`. Used by the render-decision
 * step; the heavy authored fields are hydrated separately at render time.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @returns Every event's identifying tuple with its staleness flag, ordered by
 *   `(seasonal_year, season, position)` ascending.
 */
const findEventRenderCandidates = (db: DatabaseSync): EventRenderCandidate[] => {
  /** Raw rows; SQL aliases match the type's camelCase keys, and `isDbStale` arrives as a SQLite 0/1 INTEGER. */
  const rows = db.prepare(`
    SELECT
      id,
      slug,
      seasonal_year AS seasonalYear,
      season,
      (rendered_at IS NULL OR rendered_at < updated_at) AS isDbStale
    FROM events
    ORDER BY seasonal_year, season, position
  `).all()

  return rows.map(row => ({ ...row, isDbStale: row.isDbStale === 1 })) as EventRenderCandidate[]
}

export default findEventRenderCandidates
