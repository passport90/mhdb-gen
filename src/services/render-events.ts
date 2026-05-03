import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'
import type { Writable } from 'node:stream'
import findEventById from '../repositories/find-event-by-id.js'
import markRendered from '../repositories/mark-rendered.js'
import renderEvent from './render-event.js'

/**
 * Renders each event identified by `ids` and stamps `rendered_at` on success.
 * Writes one `[i/n] <slug>` progress line per event. Returns the distinct
 * `(seasonal_year, season)` slots that received a render. `ids` must be ordered
 * by `(seasonal_year, season, position)`; the returned slot list relies on
 * same-slot events being consecutive.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param ids - Event surrogate ids to render, ordered as above.
 * @param outputDir - Output root passed through to the renderer.
 * @param messageStream - Receives one progress line per event rendered.
 * @returns Distinct seasons that received at least one render this call.
 */
const renderEvents = (
  db: DatabaseSync,
  ids: number[],
  outputDir: string,
  messageStream: Writable,
): SeasonalSlot[] => {
  /** Distinct seasons accumulated across the loop. */
  const seasonsRendered: SeasonalSlot[] = []

  /** Slot of the previously appended entry; `null` before the first append. */
  let lastSlot: SeasonalSlot | null = null

  for (const [index, id] of ids.entries()) {
    /** Event hydrated for this iteration; lives only for the body of the loop. */
    const event = findEventById(db, id)

    if (lastSlot === null || !areSeasonalSlotsEqual(lastSlot, event)) {
      lastSlot = { seasonalYear: event.seasonalYear, season: event.season }
      seasonsRendered.push(lastSlot)
    }

    messageStream.write(`[${index + 1}/${ids.length}] ${event.slug}\n`)

    renderEvent(event, outputDir)
    markRendered(db, event.id)
  }

  return seasonsRendered
}

/**
 * Reports whether two seasonal slots refer to the same calendar position.
 *
 * @param a - First slot.
 * @param b - Second slot.
 * @returns `true` when both slots share the same `seasonalYear` and `season`.
 */
const areSeasonalSlotsEqual = (a: SeasonalSlot, b: SeasonalSlot): boolean =>
  a.seasonalYear === b.seasonalYear && a.season === b.season

export default renderEvents
