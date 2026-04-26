import type Controller from './types/controller.js'
import upsertController from './controllers/upsert.js'

/**
 * Resolves a command name to its controller.
 *
 * @param command - Command name to resolve.
 * @returns Controller registered for the command.
 * @throws Error when the command is not registered.
 */
const resolveRoute = (command: string): Controller => {
  if (command === 'upsert') return upsertController

  throw new Error(`unknown command: '${command}'`)
}

export default resolveRoute
