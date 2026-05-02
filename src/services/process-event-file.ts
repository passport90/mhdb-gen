import EventFileError from '../errors/event-file-error.js'
import deriveSlug from './derive-slug.js'
import parseEventFileContent from './parse-event-file-content.js'
import { readFileSync } from 'node:fs'
import upsertEvent from '../repositories/upsert-event.js'

/**
 * Persists the event described by the markdown file at the given path.
 *
 * @param path - Path to the markdown file.
 * @throws `EventFileError` wrapping any underlying failure.
 */
const processEventFile = (path: string): void => {
  try {
    /** Raw file content. */
    const content = readFileSync(path, 'utf8')

    /** Parsed event extracted from the file. */
    const parsedEvent = parseEventFileContent(content)

    /** Slug unique within the events table. */
    const slug = deriveSlug(parsedEvent)

    upsertEvent(parsedEvent, slug)
  } catch (cause) {
    throw new EventFileError(path, cause)
  }
}

export default processEventFile
