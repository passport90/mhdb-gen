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
  /** First event to render; `null` when `listings` is empty — short-circuits the rest of the function. */
  const firstEvent = hydrateEventAt(db, listings, 0)
  if (firstEvent === null) return []

  /** Distinct slots containing at least one event rendered this call; accumulated across the loop. */
  const slotsWithRenderedEvents: SeasonalSlot[] = []

  /** Slot of the previously appended entry; `null` before the first append. */
  let lastSlot: SeasonalSlot | null = null

  /** Previous iteration's event; carries forward to become `prevEvent` for the next iteration when same-slot. */
  let prevEvent: EventToRender | null = null

  /** Event being rendered this iteration; hydrated up-front so the loop can peek ahead one row. */
  let currentEvent: EventToRender = firstEvent

  for (let index = 0; index < listings.length; index++) {
    /** Peek-ahead hydration of the next event; `null` past the last listing. */
    const nextEvent = hydrateEventAt(db, listings, index + 1)

    /** Previous event gated to same-slot; `null` when from a different slot or absent. */
    const prevSiblingEvent = pickSibling(prevEvent, currentEvent)

    /** Next event gated to same-slot; `null` when from a different slot or absent. */
    const nextSiblingEvent = pickSibling(nextEvent, currentEvent)

    if (lastSlot === null || !areSeasonalSlotsEqual(lastSlot, currentEvent)) {
      lastSlot = { seasonalYear: currentEvent.seasonalYear, season: currentEvent.season }
      slotsWithRenderedEvents.push(lastSlot)
    }

    /** Progress line written for this iteration; `<position>-<slug>` mirrors the on-disk bundle name. */
    const progressLine = `[${index + 1}/${listings.length}] ${currentEvent.position}-${currentEvent.slug}\n`

    messageStream.write(progressLine)

    renderEvent(currentEvent, prevSiblingEvent, nextSiblingEvent, outputDirPath)
    markRendered(db, currentEvent.id)

    prevEvent = currentEvent
    if (nextEvent !== null) currentEvent = nextEvent
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

/**
 * Hydrates the listing at `index`, fetching its body from the database. Returns `null` when
 * `index` is past the end — lets the caller peek across the listings boundary without a guard
 * at every call site.
 *
 * @param db - Database handle.
 * @param listings - Listings the sliding-window renderer is iterating.
 * @param index - Absolute index into `listings`.
 * @returns Render-ready event when `index` is in bounds; `null` otherwise.
 */
const hydrateEventAt = (
  db: DatabaseSync,
  listings: EventListing[],
  index: number,
): EventToRender | null => {
  if (index >= listings.length) return null

  /** Listing at `index`; guaranteed defined by the bounds check above. */
  const listing = listings[index]

  return hydrateEvent(listing, findEventBodyById(db, listing.id))
}

/**
 * Picks `candidateEvent` when it shares a season slot with `currentEvent`, otherwise `null` — gates a
 * peek-ahead/peek-behind hydration into a same-slot sibling for the renderer's prev/next refs.
 *
 * @param candidateEvent - Adjacent event from the hydration window, or `null` past the window edge.
 * @param currentEvent - Event being rendered this iteration.
 * @returns `candidateEvent` when same-slot; `null` when different-slot or absent.
 */
const pickSibling = (
  candidateEvent: EventToRender | null,
  currentEvent: EventToRender,
): EventToRender | null =>
  candidateEvent !== null && areSeasonalSlotsEqual(candidateEvent, currentEvent) ? candidateEvent : null

export default renderEvents
