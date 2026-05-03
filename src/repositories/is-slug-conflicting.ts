import type { DatabaseSync } from 'node:sqlite'
import type EventSlot from '../types/event-slot.js'

/**
 * Checks whether the slug is taken by an event at a slot other than the given one.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param slug - Slug to check.
 * @param slot - Slot to exclude from the conflict check (the row being upserted).
 * @returns `true` when another row holds the slug, `false` otherwise.
 */
const isSlugConflicting = (db: DatabaseSync, slug: string, slot: EventSlot): boolean => {
  /** Result row when a conflicting row exists; `undefined` otherwise. */
  const conflictingRow = db.prepare(`
    SELECT 1 FROM events
    WHERE slug = ?
      AND NOT (seasonal_year = ? AND season = ? AND position = ?)
    LIMIT 1
  `).get(slug, slot.seasonalYear, slot.season, slot.position)

  return conflictingRow !== undefined
}

export default isSlugConflicting
