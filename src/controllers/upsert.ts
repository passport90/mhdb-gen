import type Controller from '../types/controller.js'
import processEventFile from '../services/process-event-file.js'

/**
 * Upserts each file path's event into the database, writing one `[i/n] <path>` progress line per file.
 *
 * @param args - File paths to process.
 * @param messageStream - Receives progress lines.
 * @returns Exit code (`0` on success).
 */
const upsert: Controller = async (args, messageStream) => {
  for (const [index, path] of args.entries()) {
    messageStream.write(`[${index + 1}/${args.length}] ${path}\n`)
    await processEventFile(path)
  }

  return 0
}

export default upsert
