import type { DatabaseSync } from 'node:sqlite'

/**
 * Re-renders the root `index.html` page that lists every year with at least one event.
 *
 * @param db - Database handle.
 * @param outputDirPath - Output root.
 */
const renderRootIndex = (
  db: DatabaseSync,
  outputDirPath: string,
): void => {
  void db
  void outputDirPath

  throw new Error('renderRootIndex: not yet implemented')
}

export default renderRootIndex
