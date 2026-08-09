import SEASON_NAMES from '../constants/season-names.js'
import type SeasonCard from '../types/season-card.js'
import type YearIndexPageViewModel from '../types/year-index-page-view-model.js'
import type YearIndexSource from '../types/year-index-source.js'
import buildSeasonIndexPagePath from './build-season-index-page-path.js'

/** All four season numbers, in order. */
const SEASON_NUMBERS = [0, 1, 2, 3]

/**
 * Projects the year-index source into the view model the eta template consumes — resolves
 * the year label and season cards.
 *
 * @param source - Year-index source: target year and its seasons-with-events.
 * @returns View model ready for `buildYearIndexPage`.
 */
const buildYearIndexViewModel = (source: YearIndexSource): YearIndexPageViewModel => ({
  yearLabel: String(source.year),
  seasonCards: buildSeasonCards(source.year, source.seasonsInYear),
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
    label: SEASON_NAMES[number],
    indexPagePath: seasonsWithEventsSet.has(number) ? buildSeasonIndexPagePath(year, number) : null,
  }))
}

export default buildYearIndexViewModel
