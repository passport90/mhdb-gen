import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the closest year strictly less than `year` that has at least one event.
 *
 * @param db - Database handle.
 * @param year - Reference year.
 * @returns Previous year with events, or `null` when none exists.
 */
const findPrevYearWithEvents = (db: DatabaseSync, year: number): number | null => {
  void db
  void year

  throw new Error('findPrevYearWithEvents: not yet implemented')
}

export default findPrevYearWithEvents
