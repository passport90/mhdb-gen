import type SeasonCard from './season-card.js'
import type YearLink from './year-link.js'

/** View model consumed by `buildYearIndexPage`'s eta template — every field is template-ready. */
interface YearIndexPageViewModel {
  /** Year shown in the heading and breadcrumb. */
  yearLabel: string
  /** Four cards, one per season number (0–3), in order. */
  seasonCards: SeasonCard[]
  /** Link to the previous year's index page; `null` when there is no earlier year with events. */
  prevYearLink: YearLink | null
  /** Link to the next year's index page; `null` when there is no later year with events. */
  nextYearLink: YearLink | null
}

export default YearIndexPageViewModel
