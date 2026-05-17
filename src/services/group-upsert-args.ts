import type EventSource from '../types/event-source.js'
import UsageError from '../errors/usage-error.js'

/**
 * Validates the upsert argv and groups it into one `EventSource` per event.
 *
 * @param args - Mixed list of `.md` and `.png` file paths from the upsert CLI invocation; paths must be unique.
 * @returns One `EventSource` per `.md` file in `args`, paired with its sibling `.png`.
 * @throws `UsageError` when any path has an unsupported extension or any `.md`/`.png` ends the walk unpaired.
 */
const groupUpsertArgs = (args: string[]): EventSource[] => {
  /** Paired sources accumulated by the walk. */
  const sources: EventSource[] = []

  /** Files whose sibling has not yet arrived; insertion order preserved. */
  const pendingFilePaths = new Set<string>()

  for (const filePath of args) {
    if (!filePath.endsWith('.md') && !filePath.endsWith('.png')) {
      throw new UsageError(`found orphan file ${filePath}`)
    }

    /** Path of the sibling file that completes this one's pair. */
    const partnerFilePath = filePath.endsWith('.md')
      ? `${filePath.slice(0, -3)}.png`
      : `${filePath.slice(0, -4)}.md`

    if (!pendingFilePaths.has(partnerFilePath)) {
      pendingFilePaths.add(filePath)
      continue
    }

    pendingFilePaths.delete(partnerFilePath)
    if (filePath.endsWith('.md')) {
      sources.push({ entryFilePath: filePath, illustrationFilePath: partnerFilePath })
    } else {
      sources.push({ entryFilePath: partnerFilePath, illustrationFilePath: filePath })
    }
  }

  if (pendingFilePaths.size > 0) {
    throw new UsageError(`found orphan files: ${Array.from(pendingFilePaths).join(', ')}`)
  }

  return sources
}

export default groupUpsertArgs
