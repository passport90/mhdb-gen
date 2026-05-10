/** One season card on the year index page — display label and link to its index. */
interface SeasonCard {
  /** Season number (0–3). */
  number: number
  /** Display label, e.g. `Spring`. */
  label: string
  /** Root-relative URL to the season's index page; `null` when the season has no events. */
  indexPagePath: string | null
}

export default SeasonCard
