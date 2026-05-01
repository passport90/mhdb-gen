import MissingEnvVarsError from '../errors/missing-env-vars-error.js'

/**
 * Asserts that every required environment variable is present in the dict.
 *
 * @param envVarDict - Environment variables to check (typically `process.env`).
 * @param requiredEnvVarNames - Names that must be present in `envVarDict`.
 * @throws `MissingEnvVarsError` when any required name is absent.
 */
const checkEnvVars = (envVarDict: NodeJS.ProcessEnv, requiredEnvVarNames: string[]): void => {
  /** Names of required env vars not present in `envVarDict`. */
  const missingEnvVarNames = requiredEnvVarNames.filter(name => !(name in envVarDict))

  if (missingEnvVarNames.length > 0) {
    throw new MissingEnvVarsError(missingEnvVarNames)
  }
}

export default checkEnvVars
