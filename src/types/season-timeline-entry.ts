/** One entry in the season-index event timeline — pre-rendered for the eta template. */
interface SeasonTimelineEntry {
  /** Formatted inclusive date range, e.g. `October 14, 1066` or `April 15–22, 2026`. */
  dateRangeLabel: string
  /** Event title rendered as inline HTML — markdown processed, no wrapping `<p>` tag. */
  titleInlineHtml: string
  /** Root-relative URL to the event's page, e.g. `1066/3-fall/battle-of-hastings/index.html`. */
  eventPagePath: string
}

export default SeasonTimelineEntry
