/** Skinny event row used to render an event in a season-index timeline. */
interface TimelineEvent {
  /** Position of the event within its season; used as the disambiguating prefix in the URL. */
  position: number
  /** Slug for the event; used as the URL suffix after the position prefix. */
  slug: string
  /** Event title in markdown form; rendered to inline HTML by the view-model builder. */
  title: string
  /** Start date in `YYYY-MM-DD` format. */
  startDate: string
  /** End date in `YYYY-MM-DD` format; equal to `startDate` for single-day events. */
  endDate: string
}

export default TimelineEvent
