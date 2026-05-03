import type SeasonKey from './season-key.js'

/**
 * Skinny event row used by the sync render-decision step — just the fields needed
 * to identify the row, locate its on-disk folder, and decide inclusion. The heavy
 * authored fields (title, description, illustration hash, dates) are deferred to
 * a per-event hydration call inside the render loop.
 */
interface EventRenderCandidate extends SeasonKey {
  /** Surrogate primary key of the event row. */
  id: number
  /** URL slug; identifies the on-disk output folder for the row. */
  slug: string
  /** `true` when the row's `rendered_at` is null or older than `updated_at`. */
  isDbStale: boolean
}

export default EventRenderCandidate
