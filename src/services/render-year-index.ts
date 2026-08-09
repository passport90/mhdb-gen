import { mkdirSync, writeFileSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import type YearIndexSource from '../types/year-index-source.js'
import buildYearIndexPage from '../presenters/build-year-index-page.js'
import buildYearIndexViewModel from '../presenters/build-year-index-view-model.js'
import compareListingToYear from './compare-listing-to-year.js'
import findLowerBound from '../helpers/find-lower-bound.js'
import { join } from 'node:path'

/**
 * Renders the year's index page at `<outputDirPath>/<year>/index.html` when the year has events.
 * No-ops when `year` has no events in `listings` — `pruneOrphanOutput` has already removed the
 * directory and its stale index, and the renderer declines to recreate it.
 *
 * @param outputDirPath - Output root.
 * @param year - Seasonal year whose index page is being rendered.
 * @param listings - Snapshot of every event listing; the season set is derived from it in memory.
 */
const renderYearIndex = (
  outputDirPath: string,
  year: number,
  listings: EventListing[],
): void => {
  /** Year-index source — the seasons in the year. */
  const source = deriveYearIndexSource(listings, year)

  if (source.seasonsInYear.length === 0) return

  /** View model assembled from the source. */
  const viewModel = buildYearIndexViewModel(source)
  /** Rendered HTML for the year index page. */
  const html = buildYearIndexPage(viewModel)

  /** Year directory under the output root. */
  const yearDirPath = join(outputDirPath, String(year))

  mkdirSync(yearDirPath, { recursive: true })
  writeFileSync(join(yearDirPath, 'index.html'), html)
}

/**
 * Harvests every piece of data the year-index render needs: the distinct seasons in `year`,
 * deduped by consecutive same-season runs. Binary-searches `listings` for the year's first
 * event, then walks only that year — O(log n + events in year). Relies on `listings` being
 * sorted by `(seasonal_year, season, position)`.
 *
 * @param listings - Snapshot of every event listing, ordered as above.
 * @param year - Target year whose source is being derived.
 * @returns Year-index source — the year and its seasons.
 */
const deriveYearIndexSource = (listings: EventListing[], year: number): YearIndexSource => {
  /** Index of the year's first event, or — when the year is empty — of the first later event. */
  const firstIndex = findLowerBound(listings, year, compareListingToYear)

  /** Distinct seasons in `year` accumulated so far, in ascending encounter order. */
  const seasonsInYear: number[] = []

  /** Last season pushed into `seasonsInYear`; tracks the dedup boundary. */
  let lastSeasonInYear: number | null = null

  /** Cursor walked forward from `firstIndex` while listings remain in `year`. */
  let index = firstIndex
  while (index < listings.length && listings[index].seasonalYear === year) {
    /** Season number for the current listing. */
    const season = listings[index].season

    if (season !== lastSeasonInYear) {
      seasonsInYear.push(season)
      lastSeasonInYear = season
    }

    index++
  }

  return { year, seasonsInYear }
}

export default renderYearIndex
