import type Controller from '../types/controller.js'
import processEventFile from '../process-event-file.js'

/**
 * Upserts each file path's event into the database, sequentially, writing one `[i/n] <path>` progress line per file.
 *
 * @param args - File paths to process.
 * @param _inputStream - Unused.
 * @param _outputStream - Unused; upsert writes nothing to stdout.
 * @param errorStream - Receives progress lines.
 * @returns Exit code (`0` on success).
 */
const upsert: Controller = async (args, _inputStream, _outputStream, errorStream) => {
  for (const [index, path] of args.entries()) {
    errorStream.write(`[${index + 1}/${args.length}] ${path}\n`)
    await processEventFile(path)
  }

  return 0
}

export default upsert
