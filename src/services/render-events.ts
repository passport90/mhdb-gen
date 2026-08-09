import type { DatabaseSync } from 'node:sqlite'
import type EventBody from '../types/event-body.js'
import type EventListing from '../types/event-listing.js'
import type EventToRender from '../types/event-to-render.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import type { Writable } from 'node:stream'
import findEventBodyById from '../repositories/find-event-body-by-id.js'
import markRendered from '../repositories/mark-rendered.js'
import renderEvent from './render-event.js'

/**
 * Renders each event identified by `listings` and stamps `rendered_at` on success.
 * Writes one `[i/n] <position>-<slug>` progress line per event. Returns the distinct
 * `(seasonal_year, season)` slots that contain at least one rendered event.
 * `listings` must be ordered by `(seasonal_year, season, position)`; the returned
 * slot list relies on same-slot events being consecutive.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param listings - Listings of events to render, ordered as above; each carries the
 *   pre-derived slug, so the renderer never re-slugifies.
 * @param outputDirPath - Output root passed through to the renderer.
 * @param messageStream - Receives one progress line per event rendered.
 * @returns Distinct slots containing at least one event rendered this call.
 */
const renderEvents = (
  db: DatabaseSync,
  listings: EventListing[],
  outputDirPath: string,
  messageStream: Writable,
): SeasonalSlot[] => {
  /** Distinct slots containing at least one event rendered this call; accumulated across the loop. */
  const slotsWithRenderedEvents: SeasonalSlot[] = []

  /** Slot of the previously appended entry; `null` before the first append. */
  let lastSlot: SeasonalSlot | null = null

  for (let index = 0; index < listings.length; index++) {
    /** Listing at the current position. */
    const listing = listings[index]

    /** Event being rendered this iteration. */
    const event = hydrateEvent(listing, findEventBodyById(db, listing.id))

    if (lastSlot === null || !areSeasonalSlotsEqual(lastSlot, event)) {
      lastSlot = { seasonalYear: event.seasonalYear, season: event.season }
      slotsWithRenderedEvents.push(lastSlot)
    }

    /** Progress line written for this iteration; `<position>-<slug>` mirrors the on-disk bundle name. */
    const progressLine = `[${index + 1}/${listings.length}] ${event.position}-${event.slug}\n`

    messageStream.write(progressLine)

    renderEvent(event, outputDirPath)
    markRendered(db, event.id)
  }

  return slotsWithRenderedEvents
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

/**
 * Combines a listing (identifying tuple, pre-derived slug, last-modified timestamp) with the
 * body fetched from the database into an `EventToRender`. Lets the renderer consume the
 * full event shape without the service re-slugifying or the repo redundantly re-selecting
 * listing columns.
 *
 * @param listing - Listing for the event, carrying id, slot, slug, and updatedAt.
 * @param body - Body fields from `findEventBodyById` — title, description, illustration hash, dates.
 * @returns Render-ready event combining listing and body.
 */
const hydrateEvent = (listing: EventListing, body: EventBody): EventToRender => ({
  id: listing.id,
  seasonalYear: listing.seasonalYear,
  season: listing.season,
  position: listing.position,
  slug: listing.slug,
  updatedAt: listing.updatedAt,
  ...body,
})

export default renderEvents
