import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the events in a season, in position order. Hollow until the row shape is designed; flows
 * through the chain via `unknown[]`.
 *
 * @param db - Database handle.
 * @param year - Seasonal year of the slot.
 * @param season - Season number (0–3) of the slot.
 * @returns Event headers ordered by `position` ascending.
 */
const findEventsInSeason = (db: DatabaseSync, year: number, season: number): unknown[] => {
  void db
  void year
  void season

  throw new Error('findEventsInSeason: not yet implemented')
}

export default findEventsInSeason
