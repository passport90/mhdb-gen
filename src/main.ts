import type Controller from './types/controller.js'
import { USAGE_ERROR_EXIT_CODE } from './constants/exit-codes.js'
import type { Writable } from 'node:stream'
import resolveRoute from './router.js'

/**
 * Dispatches the invocation to the resolved sub-command controller, or prints usage if no command is given.
 *
 * @param args - First entry is the sub-command name; remaining entries are forwarded to the resolved controller.
 * @param messageStream - Where the program emits human-facing messages — usage, progress, errors, diagnostics.
 * @returns Exit code from the resolved controller, or `USAGE_ERROR_EXIT_CODE` if no command was given.
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

  /** Controller resolved from the command name. */
  const controller = resolveRoute(command)

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
