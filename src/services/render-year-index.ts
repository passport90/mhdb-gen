import type { DatabaseSync } from 'node:sqlite'

/**
 * Re-renders the year index page at `<outputDirPath>/<year>/index.html`, listing the seasons that
 * year contains.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 * @param year - Seasonal year whose index page is being refreshed.
 */
const renderYearIndex = (
  db: DatabaseSync,
  outputDirPath: string,
  year: number,
): void => {
  void db
  void outputDirPath
  void year

  throw new Error('renderYearIndex: not yet implemented')
}

export default renderYearIndex
