/**
 * Canonical URL and on-disk path segment for each season, indexed by the SQL `season` domain
 * (0–3). Used wherever the season appears in a URL or filesystem path so humans browsing the
 * served output see `0-winter` rather than `0`.
 */
const SEASON_PATH_SEGMENTS: readonly string[] = [
  '0-winter',
  '1-spring',
  '2-summer',
  '3-fall',
]

export default SEASON_PATH_SEGMENTS
