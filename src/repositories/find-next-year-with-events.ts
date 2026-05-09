import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the closest year strictly greater than `year` that has at least one event.
 *
 * @param db - Database handle.
 * @param year - Reference year.
 * @returns Next year with events, or `null` when none exists.
 */
const findNextYearWithEvents = (db: DatabaseSync, year: number): number | null => {
  void db
  void year

  throw new Error('findNextYearWithEvents: not yet implemented')
}

export default findNextYearWithEvents
