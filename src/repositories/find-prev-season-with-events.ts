import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Finds the closest slot strictly before `(year, season)` in (year, season) lexicographic order
 * that has at least one event.
 *
 * @param db - Database handle.
 * @param year - Reference year.
 * @param season - Reference season number (0–3).
 * @returns Previous slot with events, or `null` when none exists.
 */
const findPrevSeasonWithEvents = (db: DatabaseSync, year: number, season: number): SeasonalSlot | null => {
  void db
  void year
  void season

  throw new Error('findPrevSeasonWithEvents: not yet implemented')
}

export default findPrevSeasonWithEvents
