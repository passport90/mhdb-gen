import { DatabaseSync } from 'node:sqlite'

/**
 * Runs the given callback against a fresh SQLite connection at `MHDB_DB_PATH`,
 * closing the connection on return or throw.
 *
 * @param callback - Receives the open database handle; returns the value to forward.
 * @returns The callback's return value.
 */
const runWithDatabase = <R>(callback: (db: DatabaseSync) => R): R => {
  /** Database handle for this run; closed before return. */
  const db = new DatabaseSync(process.env.MHDB_DB_PATH as string)

  try {
    return callback(db)
  } finally {
    db.close()
  }
}

export default runWithDatabase
