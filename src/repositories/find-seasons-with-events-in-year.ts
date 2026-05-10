import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the season numbers (0–3) within a year that have at least one event.
 *
 * @param db - Database handle.
 * @param year - Seasonal year being inspected.
 * @returns Season numbers in ascending order; empty when the year has no events.
 */
const findSeasonsWithEventsInYear = (db: DatabaseSync, year: number): number[] => {
  /** Distinct-season rows for events in `year`. */
  const rows = db.prepare(`
    SELECT DISTINCT season
    FROM events
    WHERE seasonal_year = ?
    ORDER BY season ASC
  `).all(year)

  return rows.map((row) => row.season as number)
}

export default findSeasonsWithEventsInYear
