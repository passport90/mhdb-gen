import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import buildYearIndexPage from '../presenters/build-year-index-page.js'
import buildYearIndexViewModel from '../presenters/build-year-index-view-model.js'
import { join } from 'node:path'

/**
 * Single-pass derivation result for the year-index render — the seasons in the target year
 * plus its prev/next year neighbors. Private to this module since only `renderYearIndex`
 * consumes it.
 */
interface YearNeighborhood {
  /** Season numbers (0–3) in the target year with at least one event, ascending. */
  seasonsInYear: number[]
  /** Closest earlier year with events, or `null` when the target is the earliest. */
  prevYear: number | null
  /** Closest later year with events, or `null` when the target is the latest. */
  nextYear: number | null
}

/**
 * Renders the year's index page at `<outputDirPath>/<year>/index.html` when the year has events.
 * No-ops when `year` has no events in `listings` — `pruneOrphanOutput` has already removed the
 * directory and its stale index, and the renderer declines to recreate it.
 *
 * @param outputDirPath - Output root.
 * @param year - Seasonal year whose index page is being rendered.
 * @param listings - Snapshot of every event listing; the season set and prev/next year links
 *   are derived from it in a single pass.
 */
const renderYearIndex = (
  outputDirPath: string,
  year: number,
  listings: EventListing[],
): void => {
  /** Three-piece data needed to render the year-index page; derived in one pass over listings. */
  const { seasonsInYear, prevYear, nextYear } = findYearNeighborhood(listings, year)
  if (seasonsInYear.length === 0) return

  /** View model assembled from the derived data. */
  const viewModel = buildYearIndexViewModel(year, seasonsInYear, prevYear, nextYear)
  /** Rendered HTML for the year index page. */
  const html = buildYearIndexPage(viewModel)

  /** Year directory under the output root. */
  const yearDirPath = join(outputDirPath, String(year))

  mkdirSync(yearDirPath, { recursive: true })
  writeFileSync(join(yearDirPath, 'index.html'), html)
}

/**
 * Walks `listings` once and harvests every piece of data the year-index render needs:
 * the seasons in `year` (deduped by consecutive same-season runs) and the closest earlier
 * and later years with events. Relies on `listings` being sorted by
 * `(seasonal_year, season, position)`; the pass terminates as soon as the first
 * post-target listing is seen.
 *
 * @param listings - Snapshot of every event listing, ordered as above.
 * @param year - Target year whose neighborhood is being derived.
 * @returns Seasons in the target year plus prev/next year neighbors.
 */
const findYearNeighborhood = (listings: EventListing[], year: number): YearNeighborhood => {
  /** Latest year strictly below `year` seen so far; the final value is the prev-year answer. */
  let prevYear: number | null = null

  /** Distinct seasons in `year` accumulated so far, in ascending encounter order. */
  const seasonsInYear: number[] = []

  /** Last season pushed into `seasonsInYear`; tracks the dedup boundary. */
  let lastSeasonInYear: number | null = null

  /** Cursor into `listings`; advanced through the pre-target and target-year phases. */
  let index = 0

  while (index < listings.length && listings[index].seasonalYear < year) {
    prevYear = listings[index].seasonalYear
    index++
  }

  while (index < listings.length && listings[index].seasonalYear === year) {
    /** Season number for the current listing. */
    const season = listings[index].season

    if (season !== lastSeasonInYear) {
      seasonsInYear.push(season)
      lastSeasonInYear = season
    }

    index++
  }

  /** First year strictly greater than `year`; `null` when the target is the last year in `listings`. */
  const nextYear = listings[index]?.seasonalYear ?? null

  return { seasonsInYear, prevYear, nextYear }
}

export default renderYearIndex
