import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import type EventSlot from '../../src/types/event-slot.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import syncIllustrationBlob from '../../src/services/sync-illustration-blob.js'
import { tmpdir } from 'node:os'

describe('syncIllustrationBlob', () => {
  /** Slot threaded into the SUT; together with `slug` encodes the blob filename `2026-1-3-my-event.png`. */
  const slot: EventSlot = { seasonalYear: 2026, season: 1, position: 3 }

  /** Slug threaded into the SUT; appended to the slot triple for human readability. */
  const slug = 'my-event'

  /** Tmp directory created fresh per test; holds the source illustration and the blob store. */
  let tmpDirPath: string

  /** Path to the test SQLite file (file itself never created — only the sibling blob dir is touched). */
  let dbPath: string

  /** Directory the blob store writes to; computed from `dbPath` per the sibling-of-DB convention. */
  let blobDirPath: string

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    blobDirPath = `${dbPath}.blobs`
    process.env.MHDB_DB_PATH = dbPath
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('copies the source illustration into the blob store under the slot-triple filename', () => {
    /** Path to the source illustration written for this test. */
    const sourcePath = join(tmpDirPath, 'event.png')

    writeFileSync(sourcePath, 'illustration-bytes')

    syncIllustrationBlob(slot, slug, {
      filePath: sourcePath,
      hash: 'c826837811070b89df1d628d916068090ef79542c249b7f6137e8152dee6eea2',
    })

    /** Path the service is expected to have written. */
    const blobPath = join(blobDirPath, '2026-1-3-my-event.png')

    assert.strictEqual(readFileSync(blobPath, 'utf8'), 'illustration-bytes')
  })

  describe('when an existing blob already hashes to the source hash', () => {
    it('leaves the blob untouched, observable via unchanged mtime', () => {
      /** Path to the source illustration; same content as the seeded blob. */
      const sourcePath = join(tmpDirPath, 'event.png')

      /** Path to the existing blob seeded directly into the blob store. */
      const blobPath = join(blobDirPath, '2026-1-3-my-event.png')

      mkdirSync(blobDirPath, { recursive: true })
      writeFileSync(blobPath, 'illustration-bytes')
      writeFileSync(sourcePath, 'illustration-bytes')

      /** Sentinel mtime set on the existing blob; unchanged after a skipped copy. */
      const sentinelMtime = new Date('2020-01-01T00:00:00Z')

      utimesSync(blobPath, sentinelMtime, sentinelMtime)

      syncIllustrationBlob(slot, slug, {
        filePath: sourcePath,
        hash: 'c826837811070b89df1d628d916068090ef79542c249b7f6137e8152dee6eea2',
      })

      assert.strictEqual(statSync(blobPath).mtimeMs, sentinelMtime.getTime())
    })
  })

  describe('when an existing blob hashes to something different from the source hash', () => {
    it('overwrites the blob with the source bytes', () => {
      /** Path to the source illustration; differs from the seeded blob. */
      const sourcePath = join(tmpDirPath, 'event.png')

      /** Path to the existing blob seeded directly into the blob store. */
      const blobPath = join(blobDirPath, '2026-1-3-my-event.png')

      mkdirSync(blobDirPath, { recursive: true })
      writeFileSync(blobPath, 'stale-bytes')
      writeFileSync(sourcePath, 'fresh-bytes')

      syncIllustrationBlob(slot, slug, {
        filePath: sourcePath,
        hash: '1f52aac46a1dd87dbc4d7cc5099e4671ca74922aacc089cdbd3154cf44272418',
      })

      assert.strictEqual(readFileSync(blobPath, 'utf8'), 'fresh-bytes')
    })
  })

})
