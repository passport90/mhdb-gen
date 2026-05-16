import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'

/**
 * Root-relative URL of an event's page, e.g. `1066/3-fall/1-battle-of-hastings/index.html`. The
 * `<position>-<slug>` bundle directory keeps URLs sortable in `position` order within a slot and
 * matches the source markdown filename convention.
 *
 * @param year - Event's seasonal year.
 * @param season - Event's season number.
 * @param position - Event's position within its season; the prefix in the bundle directory name.
 * @param slug - Event's URL slug.
 * @returns Event page URL.
 */
const buildEventPagePath = (year: number, season: number, position: number, slug: string): string =>
  `${year}/${SEASON_PATH_SEGMENTS[season]}/${position}-${slug}/index.html`

export default buildEventPagePath
