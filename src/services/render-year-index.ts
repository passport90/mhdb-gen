import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import buildYearIndexPage from '../presenters/build-year-index-page.js'
import buildYearIndexViewModel from '../presenters/build-year-index-view-model.js'
import collectYearsWithEvents from './collect-years-with-events.js'
import { join } from 'node:path'

/**
 * Renders the year's index page at `<outputDirPath>/<year>/index.html` when the year has events.
 * No-ops when `year` has no events in `listings` — `pruneOrphanOutput` has already removed the
 * directory and its stale index, and the renderer declines to recreate it.
 *
 * @param outputDirPath - Output root.
 * @param year - Seasonal year whose index page is being rendered.
 * @param listings - Snapshot of every event listing; the season set and prev/next year links
 *   are derived from it in memory.
 */
const renderYearIndex = (
  outputDirPath: string,
  year: number,
  listings: EventListing[],
): void => {
  /** Season numbers in `year` that have at least one event, ascending. */
  const seasonsWithEvents = collectSeasonsInYear(listings, year)
  if (seasonsWithEvents.length === 0) return

  /** Distinct years with events, ascending; reference list for the adjacency lookup. */
  const yearsWithEvents = collectYearsWithEvents(listings)
  /** Position of `year` within `yearsWithEvents`. */
  const yearIndex = yearsWithEvents.indexOf(year)
  /** Closest earlier year with events, or `null` when `year` is the earliest. */
  const prevYear = yearIndex > 0 ? yearsWithEvents[yearIndex - 1] : null
  /** Closest later year with events, or `null` when `year` is the latest. */
  const nextYear = yearIndex < yearsWithEvents.length - 1 ? yearsWithEvents[yearIndex + 1] : null
  /** View model assembled from the derived data. */
  const viewModel = buildYearIndexViewModel(year, seasonsWithEvents, prevYear, nextYear)
  /** Rendered HTML for the year index page. */
  const html = buildYearIndexPage(viewModel)

  /** Year directory under the output root. */
  const yearDirPath = join(outputDirPath, String(year))

  mkdirSync(yearDirPath, { recursive: true })
  writeFileSync(join(yearDirPath, 'index.html'), html)
}

/**
 * Collects the distinct season numbers within `year` present in `listings`, ascending. Relies
 * on `listings` being sorted by `(seasonal_year, season, position)` so a single dedup pass
 * yields the right order.
 *
 * @param listings - Snapshot of every event listing.
 * @param year - Seasonal year being inspected.
 * @returns Season numbers (0–3) in ascending order; empty when the year has no events.
 */
const collectSeasonsInYear = (listings: EventListing[], year: number): number[] => {
  /** Seasons accumulated so far, in encounter (and therefore ascending) order. */
  const seasons: number[] = []

  /** Last season appended; tracks the dedup boundary across the pass. */
  let lastSeason: number | null = null

  for (const listing of listings) {
    if (listing.seasonalYear !== year) continue
    if (listing.season === lastSeason) continue
    seasons.push(listing.season)
    lastSeason = listing.season
  }

  return seasons
}

export default renderYearIndex
