import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the closest year strictly greater than `year` that has at least one event.
 *
 * @param db - Database handle.
 * @param year - Reference year.
 * @returns Next year with events, or `null` when none exists.
 */
const findNextYearWithEvents = (db: DatabaseSync, year: number): number | null => {
  /** Single row holding the smallest year strictly greater than `year`, or `undefined`. */
  const row = db.prepare(`
    SELECT seasonal_year AS year
    FROM events
    WHERE seasonal_year > ?
    ORDER BY seasonal_year ASC
    LIMIT 1
  `).get(year)

  return (row?.year as number | undefined) ?? null
}

export default findNextYearWithEvents
