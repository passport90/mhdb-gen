import MONTH_NAMES from '../constants/month-names.js'
import parseIsoDate from './parse-iso-date.js'

/**
 * Builds the formatted update timestamp label, e.g. `May 5, 2026 12:00:00`.
 *
 * @param stamp - SQLite `datetime('now')` stamp in `YYYY-MM-DD HH:MM:SS` format.
 * @returns Human-readable timestamp label.
 */
const buildUpdatedAtLabel = (stamp: string): string => {
  /** Space-separated halves of the stamp: `[YYYY-MM-DD, HH:MM:SS]`. */
  const stampParts = stamp.split(' ')
  /** Date half (`YYYY-MM-DD`). */
  const dateIso = stampParts[0]
  /** Time half (`HH:MM:SS`). */
  const timeIso = stampParts[1]
  /** Calendar date parsed from the date half. */
  const calendarDate = parseIsoDate(dateIso)

  return `${MONTH_NAMES[calendarDate.monthIndex]} ${calendarDate.dayOfMonth}, ${calendarDate.year} ${timeIso}`
}

export default buildUpdatedAtLabel
