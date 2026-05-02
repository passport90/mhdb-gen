import REQUIRED_ENV_VAR_NAMES from '../constants/required-env-var-names.js'
import checkEnvVars from '../helpers/check-env-vars.js'
import main from '../main.js'

checkEnvVars(process.env, REQUIRED_ENV_VAR_NAMES)

process.exitCode = main(process.argv.slice(2), process.stderr)
