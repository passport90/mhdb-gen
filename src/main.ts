import type Controller from './types/controller.js'
import { USAGE_ERROR_EXIT_CODE } from './constants/exit-codes.js'
import type { Writable } from 'node:stream'
import resolveRoute from './router.js'

/**
 * Dispatches the invocation to the resolved sub-command controller, or prints usage if no command is given.
 *
 * @param args - First entry is the sub-command name; remaining entries are forwarded to the resolved controller.
 * @param inputStream - Forwarded to the resolved controller.
 * @param outputStream - Forwarded to the resolved controller.
 * @param errorStream - Used for the usage banner; also forwarded to the resolved controller.
 * @returns Exit code from the resolved controller, or `USAGE_ERROR_EXIT_CODE` if no command was given.
 */
const main: Controller = async (args, inputStream, outputStream, errorStream) => {
  if (args.length === 0) {
    printUsage(errorStream)

    return USAGE_ERROR_EXIT_CODE
  }

  /** Sub-command name. */
  const command = args[0]

  /** Args passed to the sub-command. */
  const commandArgs = args.slice(1)

  /** Controller resolved from the command name. */
  const controller = resolveRoute(command)

  return controller(commandArgs, inputStream, outputStream, errorStream)
}

/**
 * Writes the usage banner to the given stream.
 *
 * @param errorStream - Stream for diagnostic output.
 */
const printUsage = (errorStream: Writable): void => {
  errorStream.write('usage: mhdb-gen <command> [...args]\n')
}

export default main
