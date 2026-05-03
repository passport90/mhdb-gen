import type DatabaseExecutionRunner from '../types/database-execution-runner.js'
import { DatabaseSync } from 'node:sqlite'

/**
 * Runs the given body inside a SQLite transaction against a fresh connection at `MHDB_DB_PATH`.
 * Commits on normal return; rolls back and re-throws on any throw. The connection is closed in either case.
 */
const runWithDatabaseTransaction: DatabaseExecutionRunner = body => {
  /** Database handle for this transaction; closed before return. */
  const db = new DatabaseSync(process.env.MHDB_DB_PATH as string)

  db.exec('BEGIN')

  try {
    /** Value returned by the body; forwarded after the transaction commits. */
    const result = body(db)

    db.exec('COMMIT')

    return result
  } catch (cause) {
    db.exec('ROLLBACK')
    throw cause
  } finally {
    db.close()
  }
}

export default runWithDatabaseTransaction
