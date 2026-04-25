import type { Readable, Writable } from 'node:stream'

/**
 * Handles an invocation with stream I/O, returning an exit code.
 *
 * @param args - Args provided to the controller.
 * @param inputStream - Stream the controller reads input from.
 * @param outputStream - Stream the controller writes its primary output to.
 * @param errorStream - Stream for diagnostics and error messages.
 * @returns Exit code.
 */
interface Controller {
  (
    args: string[],
    inputStream: Readable,
    outputStream: Writable,
    errorStream: Writable,
  ): Promise<number>
}

export default Controller
