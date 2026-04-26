/** Error wrapping a failure during the processing of a single event file. */
class EventFileError extends Error {
  /** Error class name; appears in stack traces. */
  name = 'EventFileError'

  /** Path of the file being processed when the error occurred. */
  path: string

  /**
   * Builds an `EventFileError` wrapping the given cause for the given file.
   *
   * @param path - File path being processed when the failure occurred.
   * @param cause - Original error or value that triggered the wrap.
   */
  constructor(path: string, cause: unknown) {
    /** Message lifted from the cause if it's an `Error`, otherwise the cause stringified. */
    const causeMessage = cause instanceof Error ? cause.message : String(cause)

    super(causeMessage, { cause })
    this.path = path
  }
}

export default EventFileError
