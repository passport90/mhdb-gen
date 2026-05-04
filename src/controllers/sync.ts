import type Controller from '../types/controller.js'
import { SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import { cpSync } from 'node:fs'
import findAllEventHeaders from '../repositories/find-all-event-headers.js'
import findEventIdsToRender from '../services/find-event-ids-to-render.js'
import pruneOrphanOutput from '../services/prune-orphan-output.js'
import refreshHierarchyIndexes from '../services/refresh-hierarchy-indexes.js'
import renderEvents from '../services/render-events.js'
import runWithDatabase from '../helpers/run-with-database.js'

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

  /** Asset source root from env, mirrored into `outputDir` after the DB-side reconciliation. */
  const assetsDir = process.env.MHDB_ASSETS_DIR as string

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

  copyDirectory(assetsDir, outputDir)

  return SUCCESS_EXIT_CODE
}

/**
 * Mirrors `srcDir` into `destDir` recursively, overwriting destination files unconditionally.
 * Files in `destDir` that aren't part of `srcDir` are left untouched.
 *
 * @param srcDir - Root of the source tree.
 * @param destDir - Root the source tree is mirrored into.
 */
const copyDirectory = (srcDir: string, destDir: string): void => {
  cpSync(srcDir, destDir, { recursive: true, force: true })
}

export default sync
