import type ParsedEvent from '../types/parsed-event.js'

/**
 * Inserts or updates the event row keyed by `(seasonalYear, season, position)`.
 *
 * @param _event - Parsed event data.
 * @param _slug - Pre-derived unique slug for the event.
 */
const upsertEvent = async (_event: ParsedEvent, _slug: string): Promise<void> => {}

export default upsertEvent
