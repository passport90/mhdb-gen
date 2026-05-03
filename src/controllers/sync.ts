import type Controller from '../types/controller.js'
import { SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import findEventById from '../repositories/find-event-by-id.js'
import findEventIdsToRender from '../services/find-event-ids-to-render.js'
import markRendered from '../repositories/mark-rendered.js'
import pruneOrphanOutput from '../services/prune-orphan-output.js'
import refreshHierarchyIndexes from '../services/refresh-hierarchy-indexes.js'
import renderEvent from '../services/render-event.js'
import runWithDatabase from '../helpers/run-with-database.js'
import syncStaticAssets from '../services/sync-static-assets.js'

/**
 * Reconciles the HTML output tree to current DB state — re-renders events whose `rendered_at`
 * is stale or whose folder is missing on disk, refreshes hierarchy indexes for any subtree
 * touched, mirrors static assets, and removes orphan output folders.
 *
 * @param _args - Ignored; sync currently takes no flags.
 * @param messageStream - Receives one `[i/n] <slug>` progress line per event rendered.
 * @returns `SUCCESS_EXIT_CODE` on success.
 */
const sync: Controller = (_args, messageStream) => {
  /** Output root from env, established by the bin's `checkEnvVars` gate. */
  const outputDir = process.env.MHDB_OUTPUT as string

  runWithDatabase(db => {
    /** Surrogate ids of the events that need rendering this run. */
    const ids = findEventIdsToRender(db, outputDir)

    /**
     * Distinct seasons whose subtree gained at least one re-rendered event this run.
     * Deduplication via `lastSlot` below relies on `findEventIdsToRender` returning ids
     * ordered by `(seasonal_year, season, position)` — same-slot events arrive
     * consecutively, so we only need to remember the previous slot.
     */
    const seasonsRendered: SeasonalSlot[] = []

    /** Slot of the previously appended entry; `null` before the first append. */
    let lastSlot: SeasonalSlot | null = null

    for (const [index, id] of ids.entries()) {
      /** Event hydrated for this iteration; lives only for the body of the loop. */
      const event = findEventById(db, id)

      if (lastSlot === null || !areSeasonalSlotsEqual(lastSlot, event)) {
        lastSlot = { seasonalYear: event.seasonalYear, season: event.season }
        seasonsRendered.push(lastSlot)
      }

      messageStream.write(`[${index + 1}/${ids.length}] ${event.slug}\n`)

      renderEvent(event, outputDir)
      markRendered(db, event.id)
    }

    /** Seasons whose subtrees were touched by orphan deletion. */
    const seasonsPruned = pruneOrphanOutput(db, outputDir)

    refreshHierarchyIndexes(db, outputDir, seasonsRendered, seasonsPruned)
  })

  syncStaticAssets(outputDir)

  return SUCCESS_EXIT_CODE
}

/**
 * Reports whether two seasonal slots refer to the same calendar position.
 *
 * @param a - First slot.
 * @param b - Second slot.
 * @returns `true` when both slots share the same `seasonalYear` and `season`.
 */
const areSeasonalSlotsEqual = (a: SeasonalSlot, b: SeasonalSlot): boolean =>
  a.seasonalYear === b.seasonalYear && a.season === b.season

export default sync
