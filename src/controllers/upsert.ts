import type Controller from '../types/controller.js'
import EventFileError from '../errors/event-file-error.js'
import { OPERATIONAL_ERROR_EXIT_CODE } from '../constants/exit-codes.js'
import processEventFile from '../services/process-event-file.js'

/**
 * Upserts each file path's event into the database, writing one `[i/n] <path>` progress line per file.
 *
 * @param args - File paths to process.
 * @param messageStream - Receives progress lines.
 * @returns Exit code (`0` on success, `OPERATIONAL_ERROR_EXIT_CODE` if any file fails).
 */
const upsert: Controller = async (args, messageStream) => {
  for (const [index, path] of args.entries()) {
    messageStream.write(`[${index + 1}/${args.length}] ${path}\n`)

    try {
      await processEventFile(path)
    } catch (err) {
      if (err instanceof EventFileError) {
        messageStream.write(`${err.path}: ${err.message}\n`)

        return OPERATIONAL_ERROR_EXIT_CODE
      }

      throw err
    }
  }

  return 0
}

export default upsert
