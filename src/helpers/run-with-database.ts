import type DatabaseExecutionRunner from '../types/database-execution-runner.js'
import { DatabaseSync } from 'node:sqlite'

/**
 * Runs the given body against a fresh connection at `MHDB_DB_PATH`, closing it on return or throw.
 * Statements run in autocommit — each write is its own micro-transaction. For batch atomicity use
 * `runWithDatabaseTransaction` instead.
 */
const runWithDatabase: DatabaseExecutionRunner = body => {
  /** Database handle for this invocation; closed before return. */
  const db = new DatabaseSync(process.env.MHDB_DB_PATH as string)

  try {
    return body(db)
  } finally {
    db.close()
  }
}

export default runWithDatabase
