import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Finds the closest slot strictly after `(year, season)` in (year, season) lexicographic order
 * that has at least one event.
 *
 * @param db - Database handle.
 * @param year - Reference year.
 * @param season - Reference season number (0–3).
 * @returns Next slot with events, or `null` when none exists.
 */
const findNextSeasonWithEvents = (db: DatabaseSync, year: number, season: number): SeasonalSlot | null => {
  /** Single row holding the smallest (year, season) strictly greater than the reference, or `undefined`. */
  const row = db.prepare(`
    SELECT seasonal_year AS seasonalYear, season
    FROM events
    WHERE (seasonal_year, season) > (?, ?)
    ORDER BY seasonal_year ASC, season ASC
    LIMIT 1
  `).get(year, season)

  if (row === undefined) return null

  return { seasonalYear: row.seasonalYear as number, season: row.season as number }
}

export default findNextSeasonWithEvents
