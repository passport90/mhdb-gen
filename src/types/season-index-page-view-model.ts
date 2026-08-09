import type SeasonTimelineEntry from './season-timeline-entry.js'

/** View model consumed by `buildSeasonIndexPage`'s eta template — every field is template-ready. */
interface SeasonIndexPageViewModel {
  /** Season label used in `<title>` and `<h1>`, e.g. `Spring 1066`. */
  seasonLabel: string
  /** Year shown as a link in the breadcrumb, e.g. `1066`. */
  yearLabel: string
  /** Root-relative URL to the year index page for the breadcrumb link. */
  yearIndexPagePath: string
  /** Timeline entries for the slot's events, in position order. */
  timelineEntries: SeasonTimelineEntry[]
}

export default SeasonIndexPageViewModel
