import type EventHeader from '../types/event-header.js'
import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Removes slug directories under `outputDir` whose slug is not in `headers`, then any season
 * directory left empty by that pass, then any year directory left empty in turn.
 *
 * @param headers - Snapshot of every event row; only `slug` is consulted, but taking the full
 *   header keeps the controller seam symmetric with `findEventIdsToRender`.
 * @param outputDir - Output root walked for orphan directories.
 * @returns Seasons whose subtree was touched by deletions, so their indexes can be refreshed.
 */
const pruneOrphanOutput = (headers: EventHeader[], outputDir: string): SeasonalSlot[] => {
  void headers
  void outputDir

  throw new Error('pruneOrphanOutput: not yet implemented')
}

export default pruneOrphanOutput
