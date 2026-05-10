/** Season number → display name; matches the SQL `season` CHECK domain (0–3). */
const SEASON_NAME_BY_NUMBER: Record<number, string> = {
  0: 'Winter',
  1: 'Spring',
  2: 'Summer',
  3: 'Fall',
}

export default SEASON_NAME_BY_NUMBER
