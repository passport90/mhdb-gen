import type Controller from './types/controller.js'

/**
 * Resolves a command name to a controller.
 *
 * Currently a stub: every command resolves to the no-op controller. Real
 * routing arrives once at least one sub-command is implemented.
 *
 * @param _command - Command name to resolve.
 * @returns Controller to dispatch to.
 */
const resolveRoute = (_command: string): Controller => noopController

/** No-op controller — placeholder until real sub-commands are wired up. */
const noopController: Controller = async () => 0

export default resolveRoute
