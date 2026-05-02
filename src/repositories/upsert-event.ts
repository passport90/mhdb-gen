import type ParsedEvent from '../types/parsed-event.js'
import runWithDatabase from '../helpers/run-with-database.js'

/**
 * Inserts or updates the event row keyed by `(seasonalYear, season, position)`.
 * On conflict at that slot, every column except the slot, surrogate id, and
 * `created_at` is overwritten with the incoming values.
 *
 * @param event - Parsed event data.
 * @param slug - Pre-derived unique slug for the event.
 */
const upsertEvent = (event: ParsedEvent, slug: string): void => runWithDatabase(db => {
  db.prepare(`
    INSERT INTO events (
      slug, title, description, start_date, end_date,
      seasonal_year, season, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (seasonal_year, season, position) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      description = excluded.description,
      start_date = excluded.start_date,
      end_date = excluded.end_date
  `).run(
    slug,
    event.title,
    event.description,
    event.startDate,
    event.endDate,
    event.seasonalYear,
    event.season,
    event.position,
  )
})

export default upsertEvent
