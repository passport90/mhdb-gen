import type Controller from './types/controller.js'
import UsageError from './errors/usage-error.js'
import syncController from './controllers/sync.js'
import upsertController from './controllers/upsert.js'

/**
 * Resolves a command name to its controller.
 *
 * @param command - Command name to resolve.
 * @returns `Controller` registered for the command.
 * @throws `UsageError` when the command is not registered.
 */
const resolveRoute = (command: string): Controller => {
  if (command === 'sync') return syncController
  if (command === 'upsert') return upsertController

  throw new UsageError(`unknown command: '${command}'`)
}

export default resolveRoute
