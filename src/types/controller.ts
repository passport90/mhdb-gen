import type { Writable } from 'node:stream'

/**
 * Handles an invocation, emitting messages and returning an exit code.
 *
 * @param args - Args provided to the controller.
 * @param messageStream - Stream for human-facing messages.
 * @returns Exit code.
 */
interface Controller {
  (
    args: string[],
    messageStream: Writable,
  ): number
}

export default Controller
