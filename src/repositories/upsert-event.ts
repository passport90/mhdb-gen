import type { DatabaseSync } from 'node:sqlite'
import type ParsedEvent from '../types/parsed-event.js'

/**
 * Inserts or updates the event row keyed by `(seasonalYear, season, position)`.
 * On conflict at that slot, the content columns (slug, title, description,
 * illustration_hash, start_date, end_date) are overwritten; the surrogate id
 * and timestamp columns (created_at, updated_at, rendered_at) are preserved.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param event - Parsed event data.
 * @param slug - Pre-derived unique slug for the event.
 * @param illustrationHash - Hex digest of the event's illustration PNG, or `null` when the event has no illustration.
 */
const upsertEvent = (
  db: DatabaseSync,
  event: ParsedEvent,
  slug: string,
  illustrationHash: string | null,
): void => {
  db.prepare(`
    INSERT INTO events (
      slug, title, description, illustration_hash,
      start_date, end_date,
      seasonal_year, season, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (seasonal_year, season, position) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      description = excluded.description,
      illustration_hash = excluded.illustration_hash,
      start_date = excluded.start_date,
      end_date = excluded.end_date
  `).run(
    slug,
    event.title,
    event.description,
    illustrationHash,
    event.startDate,
    event.endDate,
    event.seasonalYear,
    event.season,
    event.position,
  )
}

export default upsertEvent
