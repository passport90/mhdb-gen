/**
 * Bundle of independently-unique identifiers an event row can be addressed by —
 * either field suffices to locate the row.
 */
interface EventKeyBundle {
  /** Surrogate primary key from the `events` table. */
  id: number
  /** URL slug; unique within the `events` table. */
  slug: string
}

export default EventKeyBundle
