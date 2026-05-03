import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import syncIllustrationBlob from '../../src/services/sync-illustration-blob.js'
import { tmpdir } from 'node:os'

describe('syncIllustrationBlob', () => {
  /** Tmp directory created fresh per test; holds the source illustration and the blob store. */
  let tmpDir: string

  /** Path to the test SQLite file (file itself never created — only the sibling blob dir is touched). */
  let dbPath: string

  /** Directory the blob store writes to; computed from `dbPath` per the sibling-of-DB convention. */
  let blobDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    blobDir = `${dbPath}.blobs`
    process.env.MHDB_DB_PATH = dbPath
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('copies the source illustration into the blob store under the slug filename', () => {
    /** Path to the source illustration written for this test. */
    const sourcePath = join(tmpDir, 'event.png')

    writeFileSync(sourcePath, 'illustration-bytes')

    syncIllustrationBlob('my-event', {
      filePath: sourcePath,
      hash: 'c826837811070b89df1d628d916068090ef79542c249b7f6137e8152dee6eea2',
    })

    /** Path the service is expected to have written. */
    const blobPath = join(blobDir, 'my-event.png')

    assert.strictEqual(readFileSync(blobPath, 'utf8'), 'illustration-bytes')
  })

  describe('when an existing blob already hashes to the source hash', () => {
    it('leaves the blob untouched, observable via unchanged mtime', () => {
      /** Path to the source illustration; same content as the seeded blob. */
      const sourcePath = join(tmpDir, 'event.png')

      /** Path to the existing blob seeded directly into the blob store. */
      const blobPath = join(blobDir, 'my-event.png')

      mkdirSync(blobDir, { recursive: true })
      writeFileSync(blobPath, 'illustration-bytes')
      writeFileSync(sourcePath, 'illustration-bytes')

      /** Sentinel mtime set on the existing blob; unchanged after a skipped copy. */
      const sentinelMtime = new Date('2020-01-01T00:00:00Z')

      utimesSync(blobPath, sentinelMtime, sentinelMtime)

      syncIllustrationBlob('my-event', {
        filePath: sourcePath,
        hash: 'c826837811070b89df1d628d916068090ef79542c249b7f6137e8152dee6eea2',
      })

      assert.strictEqual(statSync(blobPath).mtimeMs, sentinelMtime.getTime())
    })
  })

  describe('when an existing blob hashes to something different from the source hash', () => {
    it('overwrites the blob with the source bytes', () => {
      /** Path to the source illustration; differs from the seeded blob. */
      const sourcePath = join(tmpDir, 'event.png')

      /** Path to the existing blob seeded directly into the blob store. */
      const blobPath = join(blobDir, 'my-event.png')

      mkdirSync(blobDir, { recursive: true })
      writeFileSync(blobPath, 'stale-bytes')
      writeFileSync(sourcePath, 'fresh-bytes')

      syncIllustrationBlob('my-event', {
        filePath: sourcePath,
        hash: '1f52aac46a1dd87dbc4d7cc5099e4671ca74922aacc089cdbd3154cf44272418',
      })

      assert.strictEqual(readFileSync(blobPath, 'utf8'), 'fresh-bytes')
    })
  })

  describe('when the illustration source is null', () => {
    it('deletes any existing blob for that slug', () => {
      /** Path to the existing blob seeded directly into the blob store. */
      const blobPath = join(blobDir, 'my-event.png')

      mkdirSync(blobDir, { recursive: true })
      writeFileSync(blobPath, 'stale-bytes')

      syncIllustrationBlob('my-event', null)

      assert.strictEqual(existsSync(blobPath), false)
    })

    describe('when no blob exists for that slug', () => {
      it('returns without error', () => {
        assert.doesNotThrow(() => syncIllustrationBlob('my-event', null))
      })
    })
  })
})
