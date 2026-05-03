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
   * Creates the on-disk output folder for the given event coordinate, simulating
   * an event whose render output is already on disk.
   *
   * @param seasonalYear - Seasonal year segment of the folder path.
   * @param season - Season segment of the folder path.
   * @param slug - Slug segment of the folder path.
   */
  const seedOutputFolder = (seasonalYear: number, season: number, slug: string): void => {
    mkdirSync(
      join(outputDir, String(seasonalYear), String(season), slug),
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

  it('returns ids of candidates that are db-stale or whose output folder is missing, in candidate order', () => {
    candidatesToReturn = [
      { id: 1, slug: 'stale-with-folder', seasonalYear: 2026, season: 1, isDbStale: true },
      { id: 2, slug: 'stale-no-folder', seasonalYear: 2026, season: 2, isDbStale: true },
      { id: 3, slug: 'fresh-with-folder', seasonalYear: 2026, season: 3, isDbStale: false },
      { id: 4, slug: 'fresh-no-folder', seasonalYear: 2026, season: 4, isDbStale: false },
    ]
    seedOutputFolder(2026, 1, 'stale-with-folder')
    seedOutputFolder(2026, 3, 'fresh-with-folder')

    /** Ids returned by the SUT. */
    const ids = findEventIdsToRender(db, outputDir)

    assert.strictEqual(findEventRenderCandidatesMock.mock.callCount(), 1)
    assert.deepStrictEqual(findEventRenderCandidatesMock.mock.calls[0].arguments, [db])

    assert.deepStrictEqual(ids, [1, 2, 4])
  })
})
