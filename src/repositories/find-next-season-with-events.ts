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
  void db
  void year
  void season

  throw new Error('findNextSeasonWithEvents: not yet implemented')
}

export default findNextSeasonWithEvents
