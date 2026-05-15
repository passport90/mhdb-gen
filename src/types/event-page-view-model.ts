import type EventLink from './event-link.js'

/** Parent navigation cluster — pointers up the hierarchy from event to season to year. */
interface Breadcrumb {
  /** Year level of the breadcrumb. */
  year: BreadcrumbLevel
  /** Season level of the breadcrumb. */
  season: BreadcrumbLevel
}

/** One level of the breadcrumb — display label plus link to that level's index page. */
interface BreadcrumbLevel {
  /** Human-readable label, e.g. `1066` or `Fall 1066`. */
  label: string
  /** Root-relative URL pointing to the level's index page, e.g. `1066/index.html` or `1066/3/index.html`. */
  indexPagePath: string
}

/** Event title rendered into both display surfaces — inline HTML for the heading, plain text for `<title>`. */
interface EventTitle {
  /** Inline HTML — markdown processed, no wrapping `<p>` tag. */
  inlineHtml: string
  /** Plain text with all markdown stripped — used inside the `<title>` tag. */
  plainText: string
}

/** Links to the previous and next events in the same season — for in-season navigation between events. */
interface SiblingNavigation {
  /** Link to the previous event in the same season; `null` at the start of the season. */
  prevLink: EventLink | null
  /** Link to the next event in the same season; `null` at the end of the season. */
  nextLink: EventLink | null
}

/**
 * View model consumed by `buildEventPage`'s eta template — every field is template-ready, no filters
 * applied at render time.
 */
interface EventPageViewModel {
  /** Event title in its two rendered forms. */
  title: EventTitle
  /** Parent navigation cluster — year and season levels. */
  breadcrumb: Breadcrumb
  /** Formatted inclusive date range, e.g. `October 14, 1066` (single day) or `April 15–22, 2026` (same month). */
  dateRangeLabel: string
  /**
   * Root-relative URL of the bundled illustration, e.g. `1066/3/battle-of-hastings/illustration.png`;
   * `null` when the event has none. Resolved against `<base href>` at render time.
   */
  illustrationPath: string | null
  /** Event description rendered to HTML by `marked`; empty string when the description is empty. */
  descriptionHtml: string
  /** Prev/next links to the in-season neighbors. */
  siblingNavigation: SiblingNavigation
  /** Formatted update timestamp label, e.g. `May 5, 2026 12:00:00`. */
  updatedAtLabel: string
}

export default EventPageViewModel
