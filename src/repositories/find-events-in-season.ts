import type { DatabaseSync } from 'node:sqlite'
import type TimelineEvent from '../types/timeline-event.js'

/**
 * Finds the events in a slot, in position order — skinny shape for season-index timeline display.
 *
 * @param db - Database handle.
 * @param year - Seasonal year of the slot.
 * @param season - Season number (0–3) of the slot.
 * @returns Timeline events ordered by `position` ascending.
 */
const findEventsInSeason = (db: DatabaseSync, year: number, season: number): TimelineEvent[] => {
  /** Raw rows for events in the slot; SQL aliases match the type's camelCase keys. */
  const rows = db.prepare(`
    SELECT
      slug,
      title,
      start_date AS startDate,
      end_date AS endDate
    FROM events
    WHERE seasonal_year = ? AND season = ?
    ORDER BY position ASC
  `).all(year, season)

  return rows.map((row) => ({
    slug: row?.slug as string,
    title: row?.title as string,
    startDate: row?.startDate as string,
    endDate: row?.endDate as string,
  }))
}

export default findEventsInSeason
