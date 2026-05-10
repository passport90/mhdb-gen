import SEASON_NAME_BY_NUMBER from '../constants/season-names.js'

/**
 * Builds the human-readable season label, e.g. `Spring 2026`.
 *
 * @param year - Seasonal year.
 * @param season - Season number in the SQL domain (0–3).
 * @returns Label combining the season name and the year.
 */
const buildSeasonLabel = (year: number, season: number): string => `${SEASON_NAME_BY_NUMBER[season]} ${year}`

export default buildSeasonLabel
