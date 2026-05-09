import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the distinct seasonal years that have at least one event row.
 *
 * @param db - Database handle.
 * @returns Years in ascending order; empty when the events table holds no rows.
 */
const findYearsWithEvents = (db: DatabaseSync): number[] => {
  /** Distinct-year rows produced by the query. */
  const rows = db.prepare(`
    SELECT DISTINCT seasonal_year AS year
    FROM events
    ORDER BY seasonal_year ASC
  `).all()

  return rows.map((row) => row.year as number)
}

export default findYearsWithEvents
