import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the season numbers (0–3) within a year that have at least one event.
 *
 * @param db - Database handle.
 * @param year - Seasonal year being inspected.
 * @returns Season numbers in ascending order; empty when the year has no events.
 */
const findSeasonsWithEventsInYear = (db: DatabaseSync, year: number): number[] => {
  void db
  void year

  throw new Error('findSeasonsWithEventsInYear: not yet implemented')
}

export default findSeasonsWithEventsInYear
