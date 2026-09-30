/**
 * Body fields of an event row — the heavy authored content plus dates, exclusive of the
 * identifying tuple already carried by `EventListing`. Returned by `findEventBodyById`;
 * combined with a listing in the render service to produce an `EventToRender`.
 */
interface EventBody {
  /** Display title, lifted from the markdown H1. */
  title: string
  /** Full event body in markdown, with the H1 line stripped. */
  description: string
  /** Model saved at import time; null for entries with unknown attribution. */
  generatedBy: string | null
  /** Hex SHA-256 of the illustration; `null` when the event has no illustration. */
  illustrationHash: string | null
  /** Inclusive start of the event in ISO 8601 (YYYY-MM-DD). */
  startDate: string
  /** Inclusive end; same format and `>= startDate`. */
  endDate: string
}

export default EventBody
