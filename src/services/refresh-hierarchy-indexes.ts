import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Re-renders the root, year, and season index pages whose subtrees were touched this run —
 * either by an event re-rendered or an orphan folder pruned.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root.
 * @param seasonsRendered - Seasons whose subtrees gained at least one re-rendered event this run.
 * @param seasonsPruned - Seasons whose orphan subtrees were pruned this run.
 */
const refreshHierarchyIndexes = (
  db: DatabaseSync,
  outputDir: string,
  seasonsRendered: SeasonalSlot[],
  seasonsPruned: SeasonalSlot[],
): void => {
  void db
  void outputDir
  void seasonsRendered
  void seasonsPruned

  throw new Error('refreshHierarchyIndexes: not yet implemented')
}

export default refreshHierarchyIndexes
