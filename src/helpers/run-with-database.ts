import type DatabaseExecutionRunner from '../types/database-execution-runner.js'

/**
 * Runs the given body against a fresh connection at `MHDB_DB_PATH`, closing it on return or throw.
 * Statements run in autocommit — each write is its own micro-transaction. For batch atomicity use
 * `runWithDatabaseTransaction` instead.
 */
const runWithDatabase: DatabaseExecutionRunner = () => {
  throw new Error('runWithDatabase: not yet implemented')
}

export default runWithDatabase
