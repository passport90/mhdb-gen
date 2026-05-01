/** Error raised when one or more required environment variables are missing. */
class MissingEnvVarsError extends Error {
  /** Error class name; appears in stack traces. */
  name = 'MissingEnvVarsError'

  /** Names of the missing required environment variables. */
  missingEnvVarNames: string[]

  /**
   * Builds a `MissingEnvVarsError` listing the given missing variable names.
   *
   * @param missingEnvVarNames - Names of the missing required environment variables.
   */
  constructor(missingEnvVarNames: string[]) {
    super(`missing required environment variables: ${missingEnvVarNames.join(', ')}`)
    this.missingEnvVarNames = missingEnvVarNames
  }
}

export default MissingEnvVarsError
