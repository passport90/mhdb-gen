import type { DatabaseSync } from 'node:sqlite'
import type EventRenderCandidate from '../types/event-render-candidate.js'

/**
 * Returns the skinny per-event identifying tuple plus an `isDbStale` flag computed in
 * SQL as `rendered_at IS NULL OR rendered_at < updated_at`. Used by the render-decision
 * step; the heavy authored fields are hydrated separately at render time. Ordered by
 * `(seasonal_year, season, position)`.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @returns Every event's identifying tuple with its staleness flag.
 */
const findEventRenderCandidates = (db: DatabaseSync): EventRenderCandidate[] => {
  void db

  throw new Error('findEventRenderCandidates: not yet implemented')
}

export default findEventRenderCandidates
