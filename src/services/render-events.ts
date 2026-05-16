import type { DatabaseSync } from 'node:sqlite'
import type EventRow from '../types/event-row.js'
import type EventToRender from '../types/event-to-render.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import type { Writable } from 'node:stream'
import findEventById from '../repositories/find-event-by-id.js'
import markRendered from '../repositories/mark-rendered.js'
import renderEvent from './render-event.js'
import slugify from '../helpers/slugify.js'

/**
 * Renders each event identified by `ids` and stamps `rendered_at` on success.
 * Writes one `[i/n] <position>-<slug>` progress line per event. Returns the distinct
 * `(seasonal_year, season)` slots that contain at least one rendered event.
 * `ids` must be ordered by `(seasonal_year, season, position)`; the returned
 * slot list relies on same-slot events being consecutive.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param ids - Event surrogate ids to render, ordered as above.
 * @param outputDirPath - Output root passed through to the renderer.
 * @param messageStream - Receives one progress line per event rendered.
 * @returns Distinct slots containing at least one event rendered this call.
 */
const renderEvents = (
  db: DatabaseSync,
  ids: number[],
  outputDirPath: string,
  messageStream: Writable,
): SeasonalSlot[] => {
  /** Distinct slots containing at least one event rendered this call; accumulated across the loop. */
  const slotsWithRenderedEvents: SeasonalSlot[] = []

  /** Slot of the previously appended entry; `null` before the first append. */
  let lastSlot: SeasonalSlot | null = null

  if (ids.length === 0) return slotsWithRenderedEvents

  /** Previous iteration's event; carries forward to become `prevEvent` for the next iteration when same-slot. */
  let prevEvent: EventToRender | null = null

  /** Event being rendered this iteration; hydrated up-front so the loop can peek ahead one row. */
  let currentEvent: EventToRender = hydrateEvent(findEventById(db, ids[0]))

  for (let index = 0; index < ids.length; index++) {
    /** Peek-ahead hydration of the next event; `null` past the last id. */
    const nextEvent = index + 1 < ids.length ? hydrateEvent(findEventById(db, ids[index + 1])) : null

    /** Previous event gated to same-slot; `null` when from a different slot or absent. */
    const prevSiblingEvent = pickSibling(prevEvent, currentEvent)

    /** Next event gated to same-slot; `null` when from a different slot or absent. */
    const nextSiblingEvent = pickSibling(nextEvent, currentEvent)

    if (lastSlot === null || !areSeasonalSlotsEqual(lastSlot, currentEvent)) {
      lastSlot = { seasonalYear: currentEvent.seasonalYear, season: currentEvent.season }
      slotsWithRenderedEvents.push(lastSlot)
    }

    /** Progress line written for this iteration; `<position>-<slug>` mirrors the on-disk bundle name. */
    const progressLine = `[${index + 1}/${ids.length}] ${currentEvent.position}-${currentEvent.slug}\n`

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
 * Wraps a raw `EventRow` from the database into an `EventToRender` by deriving the URL slug
 * from the title. Keeps the slug-derivation seam at the service boundary so the repo stays
 * SQL-only and downstream consumers read `event.slug` directly.
 *
 * @param row - Raw event row from `findEventById`.
 * @returns Render-ready event with the pre-derived slug field.
 */
const hydrateEvent = (row: EventRow): EventToRender => ({ ...row, slug: slugify(row.title) })

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
