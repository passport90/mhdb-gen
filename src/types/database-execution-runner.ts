import type { DatabaseSync } from 'node:sqlite'

/** Statements executed against an open SQLite handle for the duration of one runner invocation. */
interface DatabaseExecutionBody<R> {
  /**
   * @param db - Open SQLite handle for the body's duration.
   * @returns Value forwarded through the runner.
   */
  (db: DatabaseSync): R
}

/** Runs a `DatabaseExecutionBody` against a fresh `MHDB_DB_PATH` connection. */
interface DatabaseExecutionRunner {
  /**
   * @param body - Statements that operate on the open handle for the connection's duration.
   * @returns Value returned by the body.
   */
  <R>(body: DatabaseExecutionBody<R>): R
}

export default DatabaseExecutionRunner
