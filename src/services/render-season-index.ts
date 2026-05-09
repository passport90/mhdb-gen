import type { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Re-renders the season index page at `<outputDirPath>/<year>/<season>/index.html`, listing the
 * events in that season.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 * @param slot - Seasonal slot whose index page is being refreshed.
 */
const renderSeasonIndex = (
  db: DatabaseSync,
  outputDirPath: string,
  slot: SeasonalSlot,
): void => {
  void db
  void outputDirPath
  void slot

  throw new Error('renderSeasonIndex: not yet implemented')
}

export default renderSeasonIndex
