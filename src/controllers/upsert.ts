import { OPERATIONAL_ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../constants/exit-codes.js'
import type Controller from '../types/controller.js'
import type EventFileError from '../errors/event-file-error.js'
import processEventFile from '../services/process-event-file.js'

/**
 * Upserts each file path's event into the database, writing one `[i/n] <path>` progress line per file.
 *
 * @param args - File paths to process.
 * @param messageStream - Receives progress lines.
 * @returns `SUCCESS_EXIT_CODE` on success, `OPERATIONAL_ERROR_EXIT_CODE` if any file fails.
 */
const upsert: Controller = (args, messageStream) => {
  for (const [index, path] of args.entries()) {
    messageStream.write(`[${index + 1}/${args.length}] ${path}\n`)

    try {
      processEventFile(path)
    } catch (err) {
      /** Caught error, asserted as `EventFileError` per `processEventFile`'s contract. */
      const eventFileError = err as EventFileError

      messageStream.write(`${eventFileError.path}: ${eventFileError.message}\n`)

      return OPERATIONAL_ERROR_EXIT_CODE
    }
  }

  return SUCCESS_EXIT_CODE
}

export default upsert
