/** Hyperlink to a peer event — path to navigate to and label to display. */
interface EventLink {
  /** Relative URL pointing to the peer event's bundle. */
  path: string
  /** Peer event's raw title; the eta template applies the inline-markdown filter at render time. */
  title: string
}

/** View model consumed by `buildEventPage`'s eta template — fully resolved paths, labels, and rendered HTML. */
interface EventPageViewModel {
  /** Event's raw title; the eta template applies the inline-markdown filter at render time. */
  title: string
  /** Seasonal year shown in the breadcrumb. */
  seasonalYear: number
  /** Human-readable season label, e.g. `Spring`. */
  seasonLabel: string
  /** Relative URL pointing to the year index page. */
  yearPath: string
  /** Relative URL pointing to the season index page. */
  seasonPath: string
  /** Filename of the bundled illustration (`illustration.png`); `null` when the event has none. */
  illustration: string | null
  /** Formatted date range; equals the start date alone for single-day events. */
  dateRange: string
  /** Event description rendered to HTML by `marked`; empty string when the description is empty. */
  descriptionHtml: string
  /** Link to the previous event in the same season; `null` at the start of the season. */
  prevLink: EventLink | null
  /** Link to the next event in the same season; `null` at the end of the season. */
  nextLink: EventLink | null
  /** Raw `events.updated_at` stamp; the eta `updated_stamp` macro formats it. */
  updatedAt: string
  /** Relative path to the output root, used for `<base href>`, e.g. `../../../`. */
  rootBasePath: string
}

export default EventPageViewModel
