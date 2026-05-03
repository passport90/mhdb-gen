import type Controller from '../types/controller.js'
import { SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import type SeasonKey from '../types/season-key.js'
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

    /** Stringified `<year>:<season>` keys already added to `seasonsRendered`; dedups across iterations. */
    const seasonKeysSeen = new Set<string>()

    /** Distinct seasons whose subtree gained at least one re-rendered event this run. */
    const seasonsRendered: SeasonKey[] = []

    for (const [index, id] of ids.entries()) {
      /** Event hydrated for this iteration; lives only for the body of the loop. */
      const event = findEventById(db, id)

      /** Stringified `<year>:<season>` key for this event's slot. */
      const seasonKey = `${event.seasonalYear}:${event.season}`

      if (!seasonKeysSeen.has(seasonKey)) {
        seasonKeysSeen.add(seasonKey)
        seasonsRendered.push({ seasonalYear: event.seasonalYear, season: event.season })
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

export default sync
