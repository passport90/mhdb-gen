import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import type EventSlot from '../types/event-slot.js'
import type IllustrationSource from '../types/illustration-source.js'
import hashFile from '../helpers/hash-file.js'

/**
 * Reconciles the blob store entry for the given event with argv intent: copies
 * the source `.png` into `<MHDB_DB_PATH>.blobs/<year>-<season>-<position>-<slug>.png` when a
 * source is given, or deletes any existing blob at that location when the source is
 * `null`. Skips the copy when an existing blob already hashes to
 * `illustrationSource.hash`.
 *
 * @param slot - Event slot identifying the blob within the blob store.
 * @param slug - URL slug for the event; used as the human-readable suffix in the blob filename.
 * @param illustrationSource - Source path and content hash, or `null` when this run carries no illustration.
 */
const syncIllustrationBlob = (
  slot: EventSlot,
  slug: string,
  illustrationSource: IllustrationSource | null,
): void => {
  /** Directory holding every event's illustration blob, sibling to the SQLite file. */
  const blobDirPath = `${process.env.MHDB_DB_PATH as string}.blobs`

  /** Canonical blob path for this event. */
  const blobPath = `${blobDirPath}/${slot.seasonalYear}-${slot.season}-${slot.position}-${slug}.png`

  if (illustrationSource === null) {
    rmSync(blobPath, { force: true })

    return
  }

  if (existsSync(blobPath) && hashFile(blobPath) === illustrationSource.hash) {
    return
  }

  mkdirSync(blobDirPath, { recursive: true })
  copyFileSync(illustrationSource.filePath, blobPath)
}

export default syncIllustrationBlob
