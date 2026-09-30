import type { DatabaseSync } from 'node:sqlite'
import GENERATION_MODEL from '../constants/generation-model.js'
import type ParsedEvent from '../types/parsed-event.js'

/**
 * Inserts or updates the event row keyed by `(seasonalYear, season, position)`.
 * On conflict at that slot, the content columns (title, description, generated_by,
 * illustration_hash, start_date, end_date) are overwritten; the surrogate id
 * and timestamp columns (created_at, updated_at, rendered_at) are preserved.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param event - Parsed event data.
 * @param illustrationHash - Hex digest of the event's illustration PNG.
 */
const upsertEvent = (
  db: DatabaseSync,
  event: ParsedEvent,
  illustrationHash: string,
): void => {
  db.prepare(`
    INSERT INTO events (
      title, description, generated_by, illustration_hash,
      start_date, end_date,
      seasonal_year, season, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (seasonal_year, season, position) DO UPDATE SET
      title = excluded.title,
      generated_by = excluded.generated_by,
      description = excluded.description,
      illustration_hash = excluded.illustration_hash,
      start_date = excluded.start_date,
      end_date = excluded.end_date
  `).run(
    event.title,
    event.description,
    GENERATION_MODEL,
    illustrationHash,
    event.startDate,
    event.endDate,
    event.seasonalYear,
    event.season,
    event.position,
  )
}

export default upsertEvent
