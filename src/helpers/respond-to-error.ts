import { OPERATIONAL_ERROR_EXIT_CODE, USAGE_ERROR_EXIT_CODE } from '../constants/exit-codes.js'
import UsageError from '../errors/usage-error.js'
import type { Writable } from 'node:stream'

/**
 * Writes a caught error's message to the stream and returns the exit code that classifies it.
 * The single home of the error-to-exit-code mapping: `UsageError` maps to the usage code, every
 * other error to the operational code. Controllers delegate here instead of deciding a code
 * themselves. A non-`Error` throw is stringified and mapped to the operational code rather than
 * re-thrown, so an unexpected value still exits cleanly with a message instead of crashing.
 *
 * @param error - Error caught at a controller boundary or at `main`'s routing boundary.
 * @param messageStream - Stream the human-facing message is written to.
 * @returns `USAGE_ERROR_EXIT_CODE` for a `UsageError`, `OPERATIONAL_ERROR_EXIT_CODE` otherwise.
 */
const respondToError = (error: unknown, messageStream: Writable): number => {
  /** Human-facing message: the error's own `message`, or the value stringified when it isn't an `Error`. */
  const message = error instanceof Error ? error.message : String(error)

  messageStream.write(`${message}\n`)

  if (error instanceof UsageError) return USAGE_ERROR_EXIT_CODE

  return OPERATIONAL_ERROR_EXIT_CODE
}

export default respondToError
