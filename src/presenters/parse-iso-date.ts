import type CalendarDate from '../types/calendar-date.js'

/**
 * Parses a `YYYY-MM-DD` date string into a `CalendarDate`.
 *
 * @param dateIso - Date in `YYYY-MM-DD` format.
 * @returns Calendar date with year, zero-indexed month, and day-of-month.
 */
const parseIsoDate = (dateIso: string): CalendarDate => {
  /** Hyphen-separated components of the ISO date string. */
  const dateIsoParts = dateIso.split('-')
  /** Calendar year. */
  const year = Number(dateIsoParts[0])
  /** Zero-indexed month of year (`YYYY-MM-DD` is 1-indexed, so subtract 1). */
  const monthIndex = Number(dateIsoParts[1]) - 1
  /** Day of month. */
  const dayOfMonth = Number(dateIsoParts[2])

  return { year, monthIndex, dayOfMonth }
}

export default parseIsoDate
