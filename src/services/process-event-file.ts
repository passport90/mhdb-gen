import EventFileError from '../errors/event-file-error.js'
import deriveSlug from './derive-slug.js'
import parseEventFileContent from './parse-event-file-content.js'
import { readFile } from 'node:fs/promises'
import upsertEvent from './upsert-event.js'

/**
 * Persists the event described by the markdown file at the given path.
 *
 * @param path - Path to the markdown file.
 * @throws `EventFileError` wrapping any failure in the read → parse → slug → upsert pipeline.
 */
const processEventFile = async (path: string): Promise<void> => {
  try {
    /** Raw file content. */
    const content = await readFile(path, 'utf8')

    /** Parsed event extracted from the file. */
    const parsedEvent = parseEventFileContent(content)

    /** Slug unique within the events table. */
    const slug = await deriveSlug(parsedEvent.title)

    await upsertEvent(parsedEvent, slug)
  } catch (cause) {
    throw new EventFileError(path, cause)
  }
}

export default processEventFile
