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

  /** Markdown paths keyed by `<dirname>/<basename-without-extension>`; insertion order tracks argv. */
  const entryFilePathByPairKey = new Map(entryFilePaths.map(path => [toPairKey(path), path]))

  /** Illustration paths keyed by `<dirname>/<basename-without-extension>`; insertion order tracks argv. */
  const illustrationFilePathByPairKey = new Map(illustrationFilePaths.map(path => [toPairKey(path), path]))

  /** Illustrations whose pair key has no matching markdown, in argv-encounter order. */
  const orphanIllustrationFilePaths: string[] = []
  for (const [pairKey, illustrationFilePath] of illustrationFilePathByPairKey) {
    if (entryFilePathByPairKey.has(pairKey)) continue
    orphanIllustrationFilePaths.push(illustrationFilePath)
  }

  if (orphanIllustrationFilePaths.length > 0) {
    throw new UsageError(`illustrations without matching markdown: ${orphanIllustrationFilePaths.join(', ')}`)
  }

  return Array.from(entryFilePathByPairKey, ([pairKey, entryFilePath]) => ({
    entryFilePath,
    illustrationFilePath: illustrationFilePathByPairKey.get(pairKey) ?? null,
  }))
}

/**
 * Computes the pair key for a path: `<dirname>/<basename-without-extension>`.
 *
 * @param filePath - File path to key.
 * @returns Key shared by sibling `.md` and `.png` files for the same event.
 */
const toPairKey = (filePath: string): string => {
  /** Parsed components of the file path. */
  const parsedPath = parse(filePath)

  return join(parsedPath.dir, parsedPath.name)
}

export default groupUpsertArgs
