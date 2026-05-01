import type EventSlot from '../types/event-slot.js'
import runWithDatabase from '../helpers/run-with-database.js'

/**
 * Checks whether the slug is taken by an event at a slot other than the given one.
 *
 * @param slug - Slug to check.
 * @param slot - Slot to exclude from the conflict check (the row being upserted).
 * @returns `true` when another row holds the slug, `false` otherwise.
 */
const isSlugConflicting = (slug: string, slot: EventSlot): boolean => runWithDatabase(db => {
  /** Result row when a conflicting row exists; `undefined` otherwise. */
  const conflictingRow = db.prepare(`
    SELECT 1 FROM events
    WHERE slug = ?
      AND NOT (seasonal_year = ? AND season = ? AND position = ?)
    LIMIT 1
  `).get(slug, slot.seasonalYear, slot.season, slot.position)

  return conflictingRow !== undefined
})

export default isSlugConflicting
