import { Eta } from 'eta'
import { fileURLToPath } from 'node:url'

/** Filesystem path to the templates directory; resolved relative to this compiled module. */
const TEMPLATE_DIR_PATH = fileURLToPath(new URL('../templates/', import.meta.url))

/** Eta engine configured to load `.eta` templates from `TEMPLATE_DIR_PATH`. */
const ETA_ENGINE = new Eta({ views: TEMPLATE_DIR_PATH })

export default ETA_ENGINE
