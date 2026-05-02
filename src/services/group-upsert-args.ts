import { join, parse } from 'node:path'
import type EventSource from '../types/event-source.js'
import UsageError from '../errors/usage-error.js'

/**
 * Validates the upsert argv and groups it into one `EventSource` per event.
 *
 * @param args - Mixed list of `.md` and `.png` file paths from the upsert CLI invocation.
 * @returns One `EventSource` per `.md` file in `args`, paired with its sibling `.png` when one is also present.
 * @throws `UsageError` when any path has an unsupported extension or any `.png` lacks a sibling `.md`.
 */
const groupUpsertArgs = (args: string[]): EventSource[] => {
  /** Argv paths with neither `.md` nor `.png` extension. */
  const unsupportedFilePaths = args.filter(path => !path.endsWith('.md') && !path.endsWith('.png'))

  if (unsupportedFilePaths.length > 0) {
    throw new UsageError(`unsupported file extensions: ${unsupportedFilePaths.join(', ')}`)
  }

  /** Markdown paths in argv order. */
  const entryFilePaths = args.filter(path => path.endsWith('.md'))

  /** Illustration paths in argv order. */
  const illustrationFilePaths = args.filter(path => path.endsWith('.png'))

  /** Illustration paths keyed by `<dirname>/<basename-without-extension>`. */
  const illustrationFilePathByGroupKey = new Map(illustrationFilePaths.map(path => [toGroupKey(path), path]))

  /** Group keys for every markdown path in argv. */
  const entryGroupKeySet = new Set(entryFilePaths.map(toGroupKey))

  /** Illustration paths whose group has no matching markdown. */
  const orphanIllustrationFilePaths = illustrationFilePaths.filter(path => !entryGroupKeySet.has(toGroupKey(path)))

  if (orphanIllustrationFilePaths.length > 0) {
    throw new UsageError(`illustrations without matching markdown: ${orphanIllustrationFilePaths.join(', ')}`)
  }

  return entryFilePaths.map(entryFilePath => ({
    entryFilePath,
    illustrationFilePath: illustrationFilePathByGroupKey.get(toGroupKey(entryFilePath)) ?? null,
  }))
}

/**
 * Computes the group key for a path: `<dirname>/<basename-without-extension>`.
 *
 * @param filePath - File path to key.
 * @returns Key shared by sibling `.md` and `.png` files for the same event.
 */
const toGroupKey = (filePath: string): string => {
  /** Parsed components of the path. */
  const parsed = parse(filePath)

  return join(parsed.dir, parsed.name)
}

export default groupUpsertArgs
