import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventRenderCandidate from '../../src/types/event-render-candidate.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventIdsToRender', () => {
  /** Tmp directory created fresh per test; holds the simulated output tree. */
  let tmpDir: string

  /** Output root passed to the SUT for its folder-presence check. */
  let outputDir: string

  /** In-memory database handle threaded into the SUT; the mocked repo ignores it. */
  let db: DatabaseSync

  /** Per-test candidates the mocked repo returns; reassigned at the top of each `it`. */
  let candidatesToReturn: EventRenderCandidate[] = []

  /**
   * Singleton mock for `findEventRenderCandidates`; the closure over
   * `candidatesToReturn` lets each test substitute its inputs without rebinding
   * the SUT's import (Node's loader caches the SUT module across tests).
   */
  const findEventRenderCandidatesMock = mock.fn(() => candidatesToReturn)

  /** SUT, imported once after `mock.module` is set up; its binding to the mock stays stable. */
  let findEventIdsToRender: (db: DatabaseSync, outputDir: string) => number[]

  /**
   * Creates the on-disk output folder for the given (year, season, slug), simulating
   * an event whose render output is already on disk.
   *
   * @param slot - (seasonal year, season, slug) tuple identifying the folder.
   */
  const seedOutputFolder = (slot: { seasonalYear: number, season: number, slug: string }): void => {
    mkdirSync(
      join(outputDir, String(slot.seasonalYear), String(slot.season), slot.slug),
      { recursive: true },
    )
  }

  before(async () => {
    mock.module(
      '../../src/repositories/find-event-render-candidates.js',
      { defaultExport: findEventRenderCandidatesMock },
    )

    findEventIdsToRender = (await import('../../src/services/find-event-ids-to-render.js')).default
  })

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDir = join(tmpDir, 'output')
    db = new DatabaseSync(':memory:')
    candidatesToReturn = []
    findEventRenderCandidatesMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns the id of a db-stale candidate, in candidate order', () => {
    candidatesToReturn = [
      { id: 7, slug: 'hello-world', seasonalYear: 2026, season: 1, isDbStale: true },
    ]

    /** Ids returned by the SUT. */
    const ids = findEventIdsToRender(db, outputDir)

    assert.strictEqual(findEventRenderCandidatesMock.mock.callCount(), 1)
    assert.deepStrictEqual(findEventRenderCandidatesMock.mock.calls[0].arguments, [db])

    assert.deepStrictEqual(ids, [7])
  })

  describe('when a candidate is db-fresh and its output folder is missing on disk', () => {
    it('includes its id', () => {
      candidatesToReturn = [
        { id: 1, slug: 'orphaned-event', seasonalYear: 2026, season: 1, isDbStale: false },
      ]

      /** Ids returned by the SUT. */
      const ids = findEventIdsToRender(db, outputDir)

      assert.deepStrictEqual(ids, [1])
    })
  })

  describe('when a candidate is db-fresh and its output folder exists on disk', () => {
    it('skips it', () => {
      candidatesToReturn = [
        { id: 1, slug: 'fresh-event', seasonalYear: 2026, season: 1, isDbStale: false },
      ]
      seedOutputFolder({ seasonalYear: 2026, season: 1, slug: 'fresh-event' })

      /** Ids returned by the SUT. */
      const ids = findEventIdsToRender(db, outputDir)

      assert.deepStrictEqual(ids, [])
    })
  })
})
