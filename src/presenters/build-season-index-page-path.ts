import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'

/**
 * Root-relative URL of a season's index page, e.g. `1066/3-fall/index.html`.
 *
 * @param year - Seasonal year.
 * @param season - Season number.
 * @returns Season index page URL.
 */
const buildSeasonIndexPagePath = (year: number, season: number): string =>
  `${year}/${SEASON_PATH_SEGMENTS[season]}/index.html`

export default buildSeasonIndexPagePath
