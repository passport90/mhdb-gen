import type { DatabaseSync } from 'node:sqlite'

/**
 * Finds the distinct seasonal years that have at least one event row.
 *
 * @param db - Database handle.
 * @returns Years in ascending order; empty when the events table holds no rows.
 */
const findYearsWithEvents = (db: DatabaseSync): number[] => {
  void db

  throw new Error('findYearsWithEvents: not yet implemented')
}

export default findYearsWithEvents
