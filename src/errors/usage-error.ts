/** Error for incorrect CLI usage — unknown command, missing required arg, malformed flags. */
class UsageError extends Error {
  /** Error class name; appears in stack traces. */
  name = 'UsageError'
}

export default UsageError
