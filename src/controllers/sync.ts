import type Controller from '../types/controller.js'
import { SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import findAllEventHeaders from '../repositories/find-all-event-headers.js'
import findEventIdsToRender from '../services/find-event-ids-to-render.js'
import pruneOrphanOutput from '../services/prune-orphan-output.js'
import refreshHierarchyIndexes from '../services/refresh-hierarchy-indexes.js'
import renderEvents from '../services/render-events.js'
import runWithDatabase from '../helpers/run-with-database.js'
import syncStaticAssets from '../services/sync-static-assets.js'

/**
 * Reconciles the HTML output tree to current DB state — re-renders events whose `rendered_at`
 * is stale or whose directory is missing on disk, refreshes hierarchy indexes for any subtree
 * touched, mirrors static assets, and removes orphan output directories.
 *
 * @param _args - Ignored; sync currently takes no flags.
 * @param messageStream - Receives one `[i/n] <slug>` progress line per event rendered.
 * @returns `SUCCESS_EXIT_CODE` on success.
 */
const sync: Controller = (_args, messageStream) => {
  /** Output root from env, established by the bin's `checkEnvVars` gate. */
  const outputDir = process.env.MHDB_OUTPUT as string

  runWithDatabase(db => {
    /** Snapshot of every event row, threaded through the decision-side services. */
    const headers = findAllEventHeaders(db)

    /** Surrogate ids of the events that need rendering this run. */
    const ids = findEventIdsToRender(headers, outputDir)

    /** Distinct seasons whose subtree gained at least one re-rendered event this run. */
    const seasonsRendered = renderEvents(db, ids, outputDir, messageStream)

    /** Seasons whose subtrees were touched by orphan deletion. */
    const seasonsPruned = pruneOrphanOutput(headers, outputDir)

    refreshHierarchyIndexes(db, outputDir, seasonsRendered, seasonsPruned)
  })

  syncStaticAssets(outputDir)

  return SUCCESS_EXIT_CODE
}

export default sync
