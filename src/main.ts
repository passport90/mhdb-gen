import type Controller from './types/controller.js'
import { USAGE_ERROR_EXIT_CODE } from './constants/exit-codes.js'
import UsageError from './errors/usage-error.js'
import type { Writable } from 'node:stream'
import resolveRoute from './router.js'

/**
 * Runs the program against the given args.
 *
 * @param args - Command-line args (typically `process.argv.slice(2)`).
 * @param messageStream - Where the program emits human-facing messages — usage, progress, errors, diagnostics.
 * @returns Exit code; `0` on success, non-zero on failure.
 */
const main: Controller = async (args, messageStream) => {
  if (args.length === 0) {
    printUsage(messageStream)

    return USAGE_ERROR_EXIT_CODE
  }

  /** Sub-command name. */
  const command = args[0]

  /** Args passed to the sub-command. */
  const commandArgs = args.slice(1)

  try {
    /** Controller resolved from the command name. */
    const controller = resolveRoute(command)

    return await controller(commandArgs, messageStream)
  } catch (err) {
    if (err instanceof UsageError) {
      messageStream.write(`${err.message}\n`)

      return USAGE_ERROR_EXIT_CODE
    }

    throw err
  }
}

/**
 * Writes the usage banner to the given stream.
 *
 * @param messageStream - Stream for the banner.
 */
const printUsage = (messageStream: Writable): void => {
  messageStream.write('usage: mhdb-gen <command> [...args]\n')
}

export default main
