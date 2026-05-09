/** Hyperlink to a year's index page — display label and root-relative URL. */
interface YearLink {
  /** Year shown in the cell, e.g. `1066`. */
  label: string
  /** Root-relative URL pointing to the year's index page, e.g. `1066/index.html`. */
  indexPagePath: string
}

export default YearLink
