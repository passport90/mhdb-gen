import SEASON_NAME_BY_NUMBER from '../constants/season-names.js'
import type SeasonCard from '../types/season-card.js'
import type YearIndexPageViewModel from '../types/year-index-page-view-model.js'
import type YearLink from '../types/year-link.js'

/** All four season numbers, in order. */
const SEASON_NUMBERS = [0, 1, 2, 3]

/**
 * Projects a year + its seasons-with-events + adjacent years into the year-index view model the
 * eta template consumes — resolves the year label, season cards, and prev/next year links.
 *
 * @param year - Seasonal year of the page.
 * @param seasonsWithEvents - Season numbers (0–3) within the year that have at least one event.
 * @param prevYear - Closest earlier year with events; `null` when none.
 * @param nextYear - Closest later year with events; `null` when none.
 * @returns View model ready for `buildYearIndexPage`.
 */
const buildYearIndexViewModel = (
  year: number,
  seasonsWithEvents: number[],
  prevYear: number | null,
  nextYear: number | null,
): YearIndexPageViewModel => ({
  yearLabel: String(year),
  seasonCards: buildSeasonCards(year, seasonsWithEvents),
  prevYearLink: buildYearLink(prevYear),
  nextYearLink: buildYearLink(nextYear),
})

/**
 * Builds the four season cards for the year, marking each as a link or empty cell.
 *
 * @param year - Seasonal year (used to construct the per-season index page paths).
 * @param seasonsWithEvents - Season numbers that have at least one event.
 * @returns Cards in season-number order (Winter → Fall).
 */
const buildSeasonCards = (year: number, seasonsWithEvents: number[]): SeasonCard[] => {
  /** Lookup of season numbers that have events. */
  const seasonsWithEventsSet = new Set(seasonsWithEvents)

  return SEASON_NUMBERS.map((number) => ({
    number,
    label: SEASON_NAME_BY_NUMBER[number],
    indexPagePath: seasonsWithEventsSet.has(number) ? `${year}/${number}/index.html` : null,
  }))
}

/**
 * Builds a link to a year's index page.
 *
 * @param year - Seasonal year being linked to, or `null` to short-circuit.
 * @returns Link with display label and root-relative URL, or `null` when `year` is `null`.
 */
const buildYearLink = (year: number | null): YearLink | null => {
  if (year === null) return null

  return {
    label: String(year),
    indexPagePath: `${year}/index.html`,
  }
}

export default buildYearIndexViewModel
