import type { DatabaseSync } from 'node:sqlite'
import type EventToRender from '../types/event-to-render.js'
import type SeasonKey from '../types/season-key.js'

/**
 * Re-renders the root, year, and season index pages whose subtrees were touched this run —
 * either by an event re-rendered or an orphan folder pruned.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDir - Output root.
 * @param eventsRendered - Events re-rendered this run.
 * @param seasonsPruned - Seasons whose orphan subtrees were pruned this run.
 */
const refreshHierarchyIndexes = (
  db: DatabaseSync,
  outputDir: string,
  eventsRendered: EventToRender[],
  seasonsPruned: SeasonKey[],
): void => {
  void db
  void outputDir
  void eventsRendered
  void seasonsPruned

  throw new Error('refreshHierarchyIndexes: not yet implemented')
}

export default refreshHierarchyIndexes
