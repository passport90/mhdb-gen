import type { Writable } from 'node:stream'

/**
 * Handles an invocation, emitting messages and returning an exit code.
 *
 * @param args - Args provided to the controller.
 * @param messageStream - Stream for human-facing messages; the bin wires this to stderr.
 * @returns Exit code.
 */
interface Controller {
  (
    args: string[],
    messageStream: Writable,
  ): Promise<number>
}

export default Controller
