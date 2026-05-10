/** Skinny event row used to render an event in a season-index timeline. */
interface TimelineEvent {
  /** Slug for the event; used in the per-event URL. */
  slug: string
  /** Event title in markdown form; rendered to inline HTML by the view-model builder. */
  title: string
  /** Start date in `YYYY-MM-DD` format. */
  startDate: string
  /** End date in `YYYY-MM-DD` format; equal to `startDate` for single-day events. */
  endDate: string
}

export default TimelineEvent
