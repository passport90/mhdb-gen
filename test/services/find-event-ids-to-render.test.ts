import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import type EventHeader from '../../src/types/event-header.js'
import assert from 'node:assert/strict'
import findEventIdsToRender from '../../src/services/find-event-ids-to-render.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findEventIdsToRender', () => {
  /** Tmp directory created fresh per test; holds the simulated output tree. */
  let tmpDirPath: string

  /** Output root passed to the SUT for its directory-presence check. */
  let outputDirPath: string

  /**
   * Creates the on-disk output directory for the given event coordinate, simulating
   * an event whose render output is already on disk.
   *
   * @param seasonalYear - Seasonal year segment of the directory path.
   * @param season - Season segment of the directory path.
   * @param slug - Slug segment of the directory path.
   */
  const seedOutputDir = (seasonalYear: number, season: number, slug: string): void => {
    mkdirSync(
      join(outputDirPath, String(seasonalYear), String(season), slug),
      { recursive: true },
    )
  }

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')
  })

  afterEach(() => {
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('returns ids of headers that are db-stale or whose output dir is missing, in input order', () => {
    /**
     * Four headers cover every cell of the (isDbStale, dirExists) grid; only the two
     * with at least one "yes" should land in the output ids.
     */
    const headers: EventHeader[] = [
      {
        id: 1,
        slug: 'stale-with-dir',
        seasonalYear: 2026,
        season: 0,
        renderedAt: null,
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 2,
        slug: 'stale-no-dir',
        seasonalYear: 2026,
        season: 1,
        renderedAt: null,
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 3,
        slug: 'fresh-with-dir',
        seasonalYear: 2026,
        season: 2,
        renderedAt: '2099-01-01 00:00:00',
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 4,
        slug: 'fresh-no-dir',
        seasonalYear: 2026,
        season: 3,
        renderedAt: '2099-01-01 00:00:00',
        updatedAt: '2026-04-01 00:00:00',
      },
    ]

    seedOutputDir(2026, 0, 'stale-with-dir')
    seedOutputDir(2026, 2, 'fresh-with-dir')

    /** Ids returned by the SUT. */
    const ids = findEventIdsToRender(headers, outputDirPath)

    assert.deepStrictEqual(ids, [1, 2, 4])
  })
})
