import type { DatabaseSync } from 'node:sqlite'
import EventFileError from '../errors/event-file-error.js'
import hashFile from '../helpers/hash-file.js'
import parseEventFileContent from './parse-event-file-content.js'
import { readFileSync } from 'node:fs'
import slugify from '../helpers/slugify.js'
import syncIllustrationBlob from './sync-illustration-blob.js'
import upsertEvent from '../repositories/upsert-event.js'

/**
 * Persists the event described by the markdown file at the given path.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param entryFilePath - Path to the markdown file.
 * @param illustrationFilePath - Path to the sibling illustration PNG.
 * @throws `EventFileError` wrapping any underlying failure.
 */
const processEventFile = (
  db: DatabaseSync,
  entryFilePath: string,
  illustrationFilePath: string,
): void => {
  try {
    /** Raw markdown file content. */
    const content = readFileSync(entryFilePath, 'utf8')

    /** Parsed event extracted from the markdown. */
    const parsedEvent = parseEventFileContent(content)

    /** Hex digest of the illustration's bytes. */
    const illustrationHash = hashFile(illustrationFilePath)

    upsertEvent(db, parsedEvent, illustrationHash)
    syncIllustrationBlob(parsedEvent, slugify(parsedEvent.title), {
      filePath: illustrationFilePath,
      hash: illustrationHash,
    })
  } catch (cause) {
    throw new EventFileError(entryFilePath, cause)
  }
}

export default processEventFile
