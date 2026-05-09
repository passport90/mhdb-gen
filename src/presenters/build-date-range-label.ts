import type CalendarDate from '../types/calendar-date.js'
import MONTH_NAMES from '../constants/month-names.js'
import parseIsoDate from './parse-iso-date.js'

/**
 * Builds the inclusive date range label, collapsing redundant year/month/day pieces — single day, same
 * month, same year, or different years each get a distinct shape.
 *
 * @param startDateIso - Start of the range in `YYYY-MM-DD` format.
 * @param endDateIso - End of the range in `YYYY-MM-DD` format; equal to `startDateIso` for single-day events.
 * @returns Human-readable range label.
 */
const buildDateRangeLabel = (startDateIso: string, endDateIso: string): string => {
  /** Start date of the range. */
  const startDate = parseIsoDate(startDateIso)
  /** End date of the range. */
  const endDate = parseIsoDate(endDateIso)

  if (isSameDate(startDate, endDate)) {
    return formatDate(startDate)
  }

  if (isSameMonth(startDate, endDate)) {
    return `${MONTH_NAMES[startDate.monthIndex]} ${startDate.dayOfMonth}–${endDate.dayOfMonth}, ${startDate.year}`
  }

  if (isSameYear(startDate, endDate)) {
    return `${MONTH_NAMES[startDate.monthIndex]} ${startDate.dayOfMonth} – `
      + `${MONTH_NAMES[endDate.monthIndex]} ${endDate.dayOfMonth}, ${startDate.year}`
  }

  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

/**
 * Formats a single calendar date as `Month D, YYYY`.
 *
 * @param date - Calendar date to format.
 * @returns Formatted date.
 */
const formatDate = (date: CalendarDate): string =>
  `${MONTH_NAMES[date.monthIndex]} ${date.dayOfMonth}, ${date.year}`

/**
 * Tests whether two parsed dates point to the same calendar day.
 *
 * @param leftDate - First date.
 * @param rightDate - Second date.
 * @returns `true` when year, month, and day all match.
 */
const isSameDate = (leftDate: CalendarDate, rightDate: CalendarDate): boolean =>
  isSameMonth(leftDate, rightDate) && leftDate.dayOfMonth === rightDate.dayOfMonth

/**
 * Tests whether two parsed dates fall in the same calendar month of the same year.
 *
 * @param leftDate - First date.
 * @param rightDate - Second date.
 * @returns `true` when year and month both match.
 */
const isSameMonth = (leftDate: CalendarDate, rightDate: CalendarDate): boolean =>
  isSameYear(leftDate, rightDate) && leftDate.monthIndex === rightDate.monthIndex

/**
 * Tests whether two parsed dates fall in the same calendar year.
 *
 * @param leftDate - First date.
 * @param rightDate - Second date.
 * @returns `true` when years match.
 */
const isSameYear = (leftDate: CalendarDate, rightDate: CalendarDate): boolean =>
  leftDate.year === rightDate.year

export default buildDateRangeLabel
