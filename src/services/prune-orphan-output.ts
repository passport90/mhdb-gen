import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Removes slug directories under `outputDir` that have no corresponding row in `events`, then any season
 * directory left empty by that pass, then any year directory left empty in turn.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root walked for orphan directories.
 * @returns Seasons whose subtree was touched by deletions, so their indexes can be refreshed.
 */
const pruneOrphanOutput = (db: DatabaseSync, outputDir: string): SeasonalSlot[] => {
  void db
  void outputDir

  throw new Error('pruneOrphanOutput: not yet implemented')
}

export default pruneOrphanOutput
