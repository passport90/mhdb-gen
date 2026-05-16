import type Controller from '../types/controller.js'
import type EventHeader from '../types/event-header.js'
import type EventHeaderRow from '../types/event-header-row.js'
import { SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import { cpSync } from 'node:fs'
import findAllEventHeaders from '../repositories/find-all-event-headers.js'
import findEventsToRender from '../services/find-events-to-render.js'
import pruneOrphanOutput from '../services/prune-orphan-output.js'
import refreshHierarchyIndexes from '../services/refresh-hierarchy-indexes.js'
import renderEvents from '../services/render-events.js'
import runWithDatabase from '../helpers/run-with-database.js'
import slugify from '../helpers/slugify.js'

/**
 * Reconciles the HTML output tree to current DB state — re-renders events whose `rendered_at`
 * is stale or whose directory is missing on disk, refreshes hierarchy indexes for any subtree
 * touched, mirrors static assets, and removes orphan output directories.
 *
 * @param _args - Ignored; sync currently takes no flags.
 * @param messageStream - Receives one `[i/n] <position>-<slug>` progress line per event rendered.
 * @returns `SUCCESS_EXIT_CODE` on success.
 */
const sync: Controller = (_args, messageStream) => {
  /** Output root from env, established by the bin's `checkEnvVars` gate. */
  const outputDirPath = process.env.MHDB_OUTPUT_DIR_PATH as string

  /** Asset source root from env, mirrored into `outputDirPath` after the DB-side reconciliation. */
  const assetsDirPath = process.env.MHDB_ASSETS_DIR_PATH as string

  runWithDatabase(db => {
    /** Snapshot of every event row, threaded through the decision-side services with pre-derived slug. */
    const headers = findAllEventHeaders(db).map(hydrateHeader)

    /** Headers of the events that need rendering this run; carry the slug forward to the renderer. */
    const eventsToRender = findEventsToRender(headers, outputDirPath)

    /** Distinct slots containing at least one event re-rendered this run. */
    const slotsWithRenderedEvents = renderEvents(db, eventsToRender, outputDirPath, messageStream)

    /** Distinct slots containing at least one event whose orphan output was pruned this run. */
    const slotsWithPrunedEvents = pruneOrphanOutput(headers, outputDirPath)

    refreshHierarchyIndexes(db, outputDirPath, slotsWithRenderedEvents, slotsWithPrunedEvents)
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

/**
 * Wraps a raw `EventHeaderRow` into an `EventHeader` by deriving the URL slug from the title.
 * Keeps the slug-derivation seam at the controller so the repo stays SQL-only and the
 * downstream sync services consume `header.slug` directly.
 *
 * @param row - Raw header row from `findAllEventHeaders`.
 * @returns Header with the pre-derived slug field, ready for sync decision-side services.
 */
const hydrateHeader = (row: EventHeaderRow): EventHeader => ({
  id: row.id,
  seasonalYear: row.seasonalYear,
  season: row.season,
  position: row.position,
  slug: slugify(row.title),
  renderedAt: row.renderedAt,
  updatedAt: row.updatedAt,
})

export default sync
