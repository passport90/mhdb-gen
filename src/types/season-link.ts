/** Hyperlink to a season's index page — display label and root-relative URL. */
interface SeasonLink {
  /** Human-readable label, e.g. `Winter 1066`. */
  label: string
  /** Root-relative URL pointing to the season's index page, e.g. `1066/0-winter/index.html`. */
  indexPagePath: string
}

export default SeasonLink
