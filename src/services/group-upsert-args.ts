import { join, parse } from 'node:path'
import type EventSource from '../types/event-source.js'
import UsageError from '../errors/usage-error.js'

/**
 * Validates the upsert argv and groups it into one `EventSource` per event.
 *
 * Sorts argv lexicographically and walks forward, expecting each event to surface
 * as a `<stem>.md`/`<stem>.png` pair. The first file at any step that breaks the
 * pattern — wrong extension, mismatched stem, trailing unpaired file — is the
 * orphan.
 *
 * @param args - Mixed list of `.md` and `.png` file paths from the upsert CLI invocation.
 * @returns One `EventSource` per `.md` file in `args`, paired with its sibling `.png`.
 * @throws `UsageError` on the first orphan or unsupported-extension file encountered.
 */
const groupUpsertArgs = (args: string[]): EventSource[] => {
  /** Argv copy sorted lexicographically; `.md` sorts before `.png` for the same stem (`m` < `p`). */
  const sortedArgs = [...args].sort()

  /** Paired sources accumulated by the walk. */
  const sources: EventSource[] = []

  for (let cursor = 0; cursor < sortedArgs.length; cursor += 2) {
    /** Candidate markdown at the even slot. */
    const entryFilePath = sortedArgs[cursor]

    /** Candidate illustration at the odd slot; `undefined` when `entryFilePath` is the unpaired tail. */
    const illustrationFilePath = sortedArgs[cursor + 1]

    if (!entryFilePath.endsWith('.md')) {
      throw new UsageError(`found orphan file ${entryFilePath}`)
    }

    if (illustrationFilePath === undefined) {
      throw new UsageError(`found orphan file ${entryFilePath}`)
    }

    if (!illustrationFilePath.endsWith('.png') || toStem(illustrationFilePath) !== toStem(entryFilePath)) {
      throw new UsageError(`found orphan file ${illustrationFilePath}`)
    }

    sources.push({ entryFilePath, illustrationFilePath })
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
