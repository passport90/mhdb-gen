import type SeasonCard from './season-card.js'

/** View model consumed by `buildYearIndexPage`'s eta template — every field is template-ready. */
interface YearIndexPageViewModel {
  /** Year shown in the heading and breadcrumb. */
  yearLabel: string
  /** Four cards, one per season number (0–3), in order. */
  seasonCards: SeasonCard[]
}

export default YearIndexPageViewModel
