/** Calendar date — a wall-clock year, month, and day with no time-of-day and no timezone. */
interface CalendarDate {
  /** Calendar year. */
  year: number
  /** Zero-indexed month (0 = January). */
  monthIndex: number
  /** Day of month (1–31). */
  dayOfMonth: number
}

export default CalendarDate
