import { DatabaseSync } from 'node:sqlite'

/** Statements executed between `BEGIN` and `COMMIT` of one SQLite transaction. */
interface TransactionBody<R> {
  /**
   * @param db - Open SQLite handle inside a `BEGIN`/`COMMIT` block.
   * @returns Value forwarded through the runner after the transaction commits.
   */
  (db: DatabaseSync): R
}

/** Runs a `TransactionBody` against a fresh `MHDB_DB_PATH` connection inside one transaction. */
interface DatabaseTransactionRunner {
  /**
   * @param body - Statements that operate on the open handle for the transaction's duration.
   * @returns Value returned by the body once the transaction commits.
   */
  <R>(body: TransactionBody<R>): R
}

/**
 * Runs the given body inside a SQLite transaction against a fresh connection at `MHDB_DB_PATH`.
 * Commits on normal return; rolls back and re-throws on any throw. The connection is closed in either case.
 */
const runWithDatabaseTransaction: DatabaseTransactionRunner = body => {
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
