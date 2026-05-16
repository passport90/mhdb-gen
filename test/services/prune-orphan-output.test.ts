import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type EventListing from '../../src/types/event-listing.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import pruneOrphanOutput from '../../src/services/prune-orphan-output.js'
import { tmpdir } from 'node:os'

describe('pruneOrphanOutput', () => {
  /** Tmp directory created fresh per test; encloses the output root. */
  let tmpDirPath: string

  /** Output root passed to the SUT; created lazily by the seed helpers. */
  let outputDirPath: string

  /**
   * Orders slots by `(seasonalYear, season)` ascending — makes the touched-slots
   * assertion independent of filesystem walk order.
   *
   * @param a - First slot.
   * @param b - Second slot.
   * @returns Negative when `a < b`, positive when `a > b`, zero when equal.
   */
  const compareSlots = (a: SeasonalSlot, b: SeasonalSlot): number =>
    a.seasonalYear - b.seasonalYear || a.season - b.season

  /**
   * Seeds an empty directory at `outputDirPath/<relativePath>`, creating any intermediate
   * directories needed.
   *
   * @param relativePath - Path under `outputDirPath` to materialize.
   */
  const seedDir = (relativePath: string): void => {
    mkdirSync(join(outputDirPath, relativePath), { recursive: true })
  }

  /**
   * Seeds an empty regular file at `outputDirPath/<relativePath>`, creating any intermediate
   * directories needed.
   *
   * @param relativePath - Path under `outputDirPath` to materialize.
   */
  const seedFile = (relativePath: string): void => {
    /** Absolute path to the file to write. */
    const filePath = join(outputDirPath, relativePath)

    mkdirSync(join(filePath, '..'), { recursive: true })
    writeFileSync(filePath, '')
  }

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')
  })

  afterEach(() => {
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('removes orphan entries plus season-level junk, sweeps empty parents, reports touched seasons', () => {
    /**
     * Two listings establish the valid set: `kept-spring` lives at (2026, 1) and `moved`
     * at (2026, 2). On disk, `moved` was previously rendered at (2025, 3) — that prior
     * location is orphan since the canonical key now points elsewhere.
     */
    const listings: EventListing[] = [
      {
        id: 1,
        slug: 'kept-spring',
        seasonalYear: 2026,
        season: 1,
        position: 1,
        renderedAt: '2026-04-15 00:00:00',
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 2,
        slug: 'moved',
        seasonalYear: 2026,
        season: 2,
        position: 1,
        renderedAt: '2026-06-15 00:00:00',
        updatedAt: '2026-06-01 00:00:00',
      },
    ]

    seedDir('2026/1-spring/1-kept-spring')
    seedDir('2026/1-spring/9-orphan-spring')
    seedFile('2026/1-spring/notes.txt')
    seedDir('2025/3-fall/1-moved')
    seedDir('2024/0-winter/8-orphan-only')
    seedFile('2024/1-spring/notes.txt')
    seedFile('1066/3-fall/index.html')
    seedFile('1066/index.html')
    seedFile('static-asset.css')

    /** Touched slots returned by the SUT. */
    const touchedSlots = pruneOrphanOutput(listings, outputDirPath)

    assert.ok(existsSync(join(outputDirPath, '2026/1-spring/1-kept-spring')))
    assert.ok(!existsSync(join(outputDirPath, '2026/1-spring/9-orphan-spring')))
    assert.ok(!existsSync(join(outputDirPath, '2026/1-spring/notes.txt')))

    assert.ok(!existsSync(join(outputDirPath, '2025')))

    assert.ok(!existsSync(join(outputDirPath, '2024')))

    assert.ok(!existsSync(join(outputDirPath, '1066')))

    assert.ok(existsSync(join(outputDirPath, 'static-asset.css')))

    /** Touched slots sorted by `(seasonalYear, season)` so the assertion is order-independent. */
    const sortedSlots = [...touchedSlots].sort(compareSlots)
    assert.deepStrictEqual(
      sortedSlots,
      [
        { seasonalYear: 2024, season: 0 },
        { seasonalYear: 2024, season: 1 },
        { seasonalYear: 2025, season: 3 },
        { seasonalYear: 2026, season: 1 },
      ],
    )
  })
})
