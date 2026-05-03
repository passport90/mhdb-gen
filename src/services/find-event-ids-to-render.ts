import type { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import findEventRenderCandidates from '../repositories/find-event-render-candidates.js'
import { join } from 'node:path'

/**
 * Returns the ids of events whose output is stale or missing on disk — those flagged
 * db-stale by the candidate query, plus those whose
 * `<outputDir>/<seasonalYear>/<season>/<slug>/` folder does not exist. The render
 * loop hydrates each id back into a full event one at a time.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root used to check folder presence.
 * @returns Surrogate ids of the events to render, in candidate order.
 */
const findEventIdsToRender = (db: DatabaseSync, outputDir: string): number[] => {
  /** Every event's identifying tuple plus its db-staleness flag. */
  const candidates = findEventRenderCandidates(db)

  /** Ids accumulated for return. */
  const ids: number[] = []

  for (const candidate of candidates) {
    /** Filesystem path where the event's output folder is expected to exist. */
    const folderPath = join(
      outputDir,
      String(candidate.seasonalYear),
      String(candidate.season),
      candidate.slug,
    )

    if (candidate.isDbStale || !existsSync(folderPath)) {
      ids.push(candidate.id)
    }
  }

  return ids
}

export default findEventIdsToRender
