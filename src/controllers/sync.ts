import type Controller from '../types/controller.js'
import { SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import findEventsToRender from '../repositories/find-events-to-render.js'
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
    /** Events whose `rendered_at` is stale or whose on-disk folder is missing. */
    const eventsToRender = findEventsToRender(db, outputDir)

    for (const [index, event] of eventsToRender.entries()) {
      messageStream.write(`[${index + 1}/${eventsToRender.length}] ${event.slug}\n`)

      renderEvent(event, outputDir)
      markRendered(db, event.id)
    }

    /** Seasons whose subtrees were touched by orphan deletion. */
    const seasonsPruned = pruneOrphanOutput(db, outputDir)

    refreshHierarchyIndexes(db, outputDir, eventsToRender, seasonsPruned)
  })

  syncStaticAssets(outputDir)

  return SUCCESS_EXIT_CODE
}

export default sync
