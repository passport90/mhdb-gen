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
  const outputDirPath = process.env.MHDB_OUTPUT_DIR_PATH as string

  /** Asset source root from env, mirrored into `outputDirPath` after the DB-side reconciliation. */
  const assetsDirPath = process.env.MHDB_ASSETS_DIR_PATH as string

  runWithDatabase(db => {
    /** Snapshot of every event row, threaded through the decision-side services. */
    const headers = findAllEventHeaders(db)

    /** Surrogate ids of the events that need rendering this run. */
    const ids = findEventIdsToRender(headers, outputDirPath)

    /** Distinct seasons whose subtree gained at least one re-rendered event this run. */
    const seasonsRendered = renderEvents(db, ids, outputDirPath, messageStream)

    /** Seasons whose subtrees were touched by orphan deletion. */
    const seasonsPruned = pruneOrphanOutput(headers, outputDirPath)

    refreshHierarchyIndexes(db, outputDirPath, seasonsRendered, seasonsPruned)
  })

  copyDirectory(assetsDirPath, outputDirPath)

  return SUCCESS_EXIT_CODE
}

/**
 * Mirrors `srcDirPath` into `destDirPath` recursively, overwriting destination files unconditionally.
 * Files in `destDirPath` that aren't part of `srcDirPath` are left untouched.
 *
 * @param srcDirPath - Root of the source tree.
 * @param destDirPath - Root the source tree is mirrored into.
 */
const copyDirectory = (srcDirPath: string, destDirPath: string): void => {
  cpSync(srcDirPath, destDirPath, { recursive: true, force: true })
}

export default sync
