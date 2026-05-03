import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import hashFile from '../../src/services/hash-file.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('hashFile', () => {
  /** Tmp directory created fresh per test; holds the fixture file. */
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns the SHA-256 hex digest of the file contents', () => {
    /** Path to the fixture file written for this test. */
    const filePath = join(tmpDir, 'fixture.txt')

    writeFileSync(filePath, 'hello world')

    assert.strictEqual(
      hashFile(filePath),
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    )
  })
})
