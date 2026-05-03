import type { DatabaseSync } from 'node:sqlite'

/**
 * Stamps the event's `rendered_at` to the current time, marking the row as in sync with disk.
 * The staleness predicate is `rendered_at IS NULL OR rendered_at < updated_at`, so writing `NOW()`
 * (always greater than the row's existing `updated_at`) shifts the row out of the to-render set.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param eventId - Surrogate primary key of the event row.
 */
const markRendered = (db: DatabaseSync, eventId: number): void => {
  void db
  void eventId

  throw new Error('markRendered: not yet implemented')
}

export default markRendered
