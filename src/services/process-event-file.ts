import type { DatabaseSync } from 'node:sqlite'
import EventFileError from '../errors/event-file-error.js'
import type IllustrationSource from '../types/illustration-source.js'
import deriveSlug from './derive-slug.js'
import hashFile from '../helpers/hash-file.js'
import parseEventFileContent from './parse-event-file-content.js'
import { readFileSync } from 'node:fs'
import syncIllustrationBlob from './sync-illustration-blob.js'
import upsertEvent from '../repositories/upsert-event.js'

/**
 * Persists the event described by the markdown file at the given path.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param entryFilePath - Path to the markdown file.
 * @param illustrationFilePath - Path to the sibling illustration PNG, or `null` when this run carries no illustration.
 * @throws `EventFileError` wrapping any underlying failure.
 */
const processEventFile = (
  db: DatabaseSync,
  entryFilePath: string,
  illustrationFilePath: string | null,
): void => {
  try {
    /** Raw markdown file content. */
    const content = readFileSync(entryFilePath, 'utf8')

    /** Parsed event extracted from the markdown. */
    const parsedEvent = parseEventFileContent(content)

    /** Slug unique within the events table. */
    const slug = deriveSlug(db, parsedEvent)

    /** Illustration source paired with its content hash, or `null` when the event has no illustration. */
    const illustrationSource = deriveIllustrationSource(illustrationFilePath)

    upsertEvent(db, parsedEvent, slug, illustrationSource?.hash ?? null)
    syncIllustrationBlob(slug, illustrationSource)
  } catch (cause) {
    throw new EventFileError(entryFilePath, cause)
  }
}

/**
 * Builds an `IllustrationSource` from the given path, returning `null` when no path is given.
 *
 * @param illustrationFilePath - Path to the illustration PNG, or `null` when there is none.
 * @returns `IllustrationSource` paired with the file's hash, or `null` when no path was given.
 */
const deriveIllustrationSource = (illustrationFilePath: string | null): IllustrationSource | null => {
  if (illustrationFilePath === null) {
    return null
  }

  return {
    filePath: illustrationFilePath,
    hash: hashFile(illustrationFilePath),
  }
}

export default processEventFile
