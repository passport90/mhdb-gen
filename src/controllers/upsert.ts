import { OPERATIONAL_ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import type Controller from '../types/controller.js'
import type EventFileError from '../errors/event-file-error.js'
import groupUpsertArgs from '../services/group-upsert-args.js'
import processEventFile from '../services/process-event-file.js'
import runWithDatabaseTransaction from '../helpers/run-with-database-transaction.js'

/**
 * Upserts each event implied by `args` into the database, writing one `[i/n] <entry>` progress line per event.
 * The batch is wrapped in one SQLite transaction: if any event fails, every row written so far is rolled back
 * so the database never reflects a partial batch. Blob copies are not rolled back; orphaned blobs from a failed
 * batch are reclaimed on the next successful upsert (hash-equality skip) or by sync-time orphan cleanup.
 *
 * @param args - Mixed list of `.md` and `.png` paths; markdown files define events and PNGs supply illustrations.
 * @param messageStream - Receives progress lines and error messages.
 * @returns `SUCCESS_EXIT_CODE` on success, `OPERATIONAL_ERROR_EXIT_CODE` if any event fails.
 */
const upsert: Controller = (args, messageStream) => {
  /** Validated, paired event sources, one per markdown file in `args`. */
  const sources = groupUpsertArgs(args)

  try {
    runWithDatabaseTransaction(db => {
      for (let index = 0; index < sources.length; index++) {
        /** Paired event source at the current batch position. */
        const source = sources[index]

        messageStream.write(`[${index + 1}/${sources.length}] ${source.entryFilePath}\n`)

        processEventFile(db, source.entryFilePath, source.illustrationFilePath)
      }
    })
  } catch (err) {
    /** Caught error, asserted as `EventFileError` per `processEventFile`'s contract. */
    const eventFileError = err as EventFileError

    messageStream.write(`${eventFileError.path}: ${eventFileError.message}\n`)

    return OPERATIONAL_ERROR_EXIT_CODE
  }

  return SUCCESS_EXIT_CODE
}

export default upsert
