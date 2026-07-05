import type Controller from './types/controller.js'
import { USAGE_ERROR_EXIT_CODE } from './constants/exit-codes.js'
import type { Writable } from 'node:stream'
import resolveRoute from './router.js'
import respondToError from './helpers/respond-to-error.js'

/**
 * Runs the program against the given args.
 *
 * @param args - Arguments to the program.
 * @param messageStream - Where the program emits human-facing messages — usage, progress, errors, diagnostics.
 * @returns Exit code; `0` on success, non-zero on failure.
 */
const main: Controller = (args, messageStream) => {
  if (args.length === 0) {
    printUsage(messageStream)

    return USAGE_ERROR_EXIT_CODE
  }

  /** Command name. */
  const command = args[0]

  /** Args passed to the command. */
  const commandArgs = args.slice(1)

  /** Controller resolved from the command name; assigned inside the routing boundary. */
  let controller: Controller

  try {
    controller = resolveRoute(command)
  } catch (error) {
    return respondToError(error, messageStream)
  }

  return controller(commandArgs, messageStream)
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
