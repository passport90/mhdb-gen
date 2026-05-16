/** Raw event row hydrated for a season's timeline — returned by `findEventsInSeason`. */
interface TimelineEventRow {
  /** Position of the event within its season; used as the disambiguating prefix in the URL. */
  position: number
  /** Event title in markdown form; rendered to inline HTML by the view-model builder, and slugified for the URL. */
  title: string
  /** Start date in `YYYY-MM-DD` format. */
  startDate: string
  /** End date in `YYYY-MM-DD` format; equal to `startDate` for single-day events. */
  endDate: string
}

export default TimelineEventRow
