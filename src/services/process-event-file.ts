import EventFileError from '../errors/event-file-error.js'
import type IllustrationSource from '../types/illustration-source.js'
import deriveSlug from './derive-slug.js'
import hashFile from './hash-file.js'
import parseEventFileContent from './parse-event-file-content.js'
import { readFileSync } from 'node:fs'
import syncIllustrationBlob from './sync-illustration-blob.js'
import upsertEvent from '../repositories/upsert-event.js'

/**
 * Persists the event described by the markdown file at the given path.
 *
 * @param entryFilePath - Path to the markdown file.
 * @param illustrationFilePath - Path to the sibling illustration PNG, or `null` when this run carries no illustration.
 * @throws `EventFileError` wrapping any underlying failure.
 */
const processEventFile = (entryFilePath: string, illustrationFilePath: string | null): void => {
  try {
    /** Raw markdown file content. */
    const content = readFileSync(entryFilePath, 'utf8')

    /** Parsed event extracted from the markdown. */
    const parsedEvent = parseEventFileContent(content)

    /** Slug unique within the events table. */
    const slug = deriveSlug(parsedEvent)

    /** Illustration source paired with its content hash, or `null` when the event has no illustration. */
    const illustrationSource = deriveIllustrationSource(illustrationFilePath)

    /** Hex digest of the illustration PNG, or `null` when the event has no illustration. */
    const illustrationHash = illustrationSource === null ? null : illustrationSource.hash

    upsertEvent(parsedEvent, slug, illustrationHash)
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
