import type { DatabaseSync } from 'node:sqlite'
import type SeasonKey from '../types/season-key.js'

/**
 * Removes slug folders under `outputDir` that have no corresponding row in `events`, then any season
 * folder left empty by that pass, then any year folder left empty in turn.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root walked for orphan folders.
 * @returns Seasons whose subtree was touched by deletions, so their indexes can be refreshed.
 */
const pruneOrphanOutput = (db: DatabaseSync, outputDir: string): SeasonKey[] => {
  void db
  void outputDir

  throw new Error('pruneOrphanOutput: not yet implemented')
}

export default pruneOrphanOutput
