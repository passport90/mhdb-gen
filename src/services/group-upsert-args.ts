import { join, parse } from 'node:path'
import type EventSource from '../types/event-source.js'
import UsageError from '../errors/usage-error.js'

/**
 * Validates the upsert argv and groups it into one `EventSource` per event.
 *
 * @param args - Mixed list of `.md` and `.png` file paths from the upsert CLI invocation.
 * @returns One `EventSource` per `.md` file in `args`, paired with its sibling `.png`.
 * @throws `UsageError` on the first orphan or unsupported-extension file encountered.
 */
const groupUpsertArgs = (args: string[]): EventSource[] => {
  /** Paired sources accumulated by the walk. */
  const sources: EventSource[] = []

  /** Earliest unpaired file seen for each stem; cleared when its sibling arrives. */
  const pendingFilePathByStem = new Map<string, string>()

  for (const filePath of args) {
    if (!filePath.endsWith('.md') && !filePath.endsWith('.png')) {
      throw new UsageError(`found orphan file ${filePath}`)
    }

    /** Stem shared by sibling `.md` and `.png` files for the same event. */
    const stem = toStem(filePath)

    /** Earlier file with this stem, or `undefined` when this is its first sighting. */
    const pendingFilePath = pendingFilePathByStem.get(stem)

    if (pendingFilePath === undefined) {
      pendingFilePathByStem.set(stem, filePath)
      continue
    }

    if (pendingFilePath.endsWith('.md') === filePath.endsWith('.md')) {
      throw new UsageError(`found orphan file ${filePath}`)
    }

    if (pendingFilePath.endsWith('.md')) {
      sources.push({ entryFilePath: pendingFilePath, illustrationFilePath: filePath })
    } else {
      sources.push({ entryFilePath: filePath, illustrationFilePath: pendingFilePath })
    }

    pendingFilePathByStem.delete(stem)
  }

  /** First file whose sibling never arrived during the walk, or `undefined` when every pair completed. */
  const firstPendingFilePath = pendingFilePathByStem.values().next().value

  if (firstPendingFilePath !== undefined) {
    throw new UsageError(`found orphan file ${firstPendingFilePath}`)
  }

  return sources
}

/**
 * Strips the extension off a path, leaving `<dirname>/<basename-without-extension>`.
 *
 * @param filePath - File path to reduce.
 * @returns Stem shared by sibling `.md` and `.png` files for the same event.
 */
const toStem = (filePath: string): string => {
  /** Parsed components of the file path. */
  const parsedPath = parse(filePath)

  return join(parsedPath.dir, parsedPath.name)
}

export default groupUpsertArgs
