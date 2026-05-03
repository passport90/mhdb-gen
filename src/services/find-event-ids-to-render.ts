import type { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import findEventRenderCandidates from '../repositories/find-event-render-candidates.js'
import { join } from 'node:path'

/**
 * Returns the ids of events whose output is stale or missing on disk — those whose
 * `rendered_at` is null or older than `updated_at`, plus those whose
 * `<outputDir>/<seasonalYear>/<season>/<slug>/` directory does not exist.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root used to check directory presence.
 * @returns Surrogate ids ordered by `(seasonal_year, season, position)` ascending.
 */
const findEventIdsToRender = (db: DatabaseSync, outputDir: string): number[] => {
  /** Every event's identifying tuple plus its db-staleness flag. */
  const candidates = findEventRenderCandidates(db)

  /** Ids accumulated for return. */
  const ids: number[] = []

  for (const candidate of candidates) {
    /** Filesystem path where the event's output directory is expected to exist. */
    const dirPath = join(
      outputDir,
      String(candidate.seasonalYear),
      String(candidate.season),
      candidate.slug,
    )

    if (candidate.isDbStale || !existsSync(dirPath)) {
      ids.push(candidate.id)
    }
  }

  return ids
}

export default findEventIdsToRender
