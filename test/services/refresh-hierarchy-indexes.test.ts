import { afterEach, beforeEach, describe, it } from 'node:test'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import type EventListing from '../../src/types/event-listing.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'
import refreshHierarchyIndexes from '../../src/services/refresh-hierarchy-indexes.js'
import { tmpdir } from 'node:os'

describe('refreshHierarchyIndexes', () => {
  /** Tmp directory holding the output tree. */
  let tmpDirPath: string

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')
  })

  afterEach(() => {
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('re-renders root, every touched year and slot, and the closest occupied neighbors of each', () => {
    /**
     * Listings cover six events across three years. Touched: 1066 fall (pruned), 2026
     * spring and 2026 summer (both rendered). Non-touched occupied: 1066 winter (slot
     * neighbor of 1066 fall), 1500 spring (year neighbor of 1066 and 2026 AND slot
     * neighbor of 1066 fall / 2026 spring — exercises both year-level and slot-level
     * expansion), 2026 fall (slot neighbor of 2026 summer). All three non-touched
     * positions must refresh as closest-occupied neighbors of a touched year or slot.
     */
    const listings: EventListing[] = [
      {
        id: 1,
        title: 'Winter 1066 Event',
        slug: 'winter-1066-event',
        startDate: '1066-01-15',
        endDate: '1066-01-16',
        seasonalYear: 1066,
        season: 0,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-01-01 00:00:00',
      },
      {
        id: 2,
        title: 'Hastings',
        slug: 'hastings',
        startDate: '1066-10-14',
        endDate: '1066-10-14',
        seasonalYear: 1066,
        season: 3,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-10-01 00:00:00',
      },
      {
        id: 3,
        title: 'Spring 1500 Event',
        slug: 'spring-1500-event',
        startDate: '1500-04-01',
        endDate: '1500-04-08',
        seasonalYear: 1500,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '1500-04-01 00:00:00',
      },
      {
        id: 4,
        title: 'Spring 2026 Event',
        slug: 'spring-2026-event',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
        seasonalYear: 2026,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 5,
        title: 'Summer 2026 Event',
        slug: 'summer-2026-event',
        startDate: '2026-07-01',
        endDate: '2026-07-08',
        seasonalYear: 2026,
        season: 2,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-07-01 00:00:00',
      },
      {
        id: 6,
        title: 'Fall 2026 Event',
        slug: 'fall-2026-event',
        startDate: '2026-10-01',
        endDate: '2026-10-08',
        seasonalYear: 2026,
        season: 3,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-10-01 00:00:00',
      },
    ]

    /** Two slots in 2026 each containing a freshly rendered event. */
    const slotsWithRenderedEvents: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
    ]

    /** One slot in 1066 whose orphan event output was pruned this run. */
    const slotsWithPrunedEvents: SeasonalSlot[] = [
      { seasonalYear: 1066, season: 3 },
    ]

    /** Mtime applied to every seeded file; deep in the past so any re-render advances mtime measurably. */
    const preRunTime = new Date('2000-01-01T00:00:00Z')

    /**
     * Output paths the SUT is expected to refresh — root, all three year indexes (one
     * reached only via year-neighbor expansion), every touched slot, and every
     * non-touched slot reachable as a closest-occupied neighbor of a touched slot. Each
     * is seeded with empty content and `preRunTime` mtime so the SUT must advance the
     * mtime to pass.
     */
    const expectedRefreshedPaths = [
      join(outputDirPath, 'index.html'),
      join(outputDirPath, '1066', 'index.html'),
      join(outputDirPath, '1500', 'index.html'),
      join(outputDirPath, '2026', 'index.html'),
      join(outputDirPath, '1066', '0-winter', 'index.html'),
      join(outputDirPath, '1066', '3-fall', 'index.html'),
      join(outputDirPath, '1500', '1-spring', 'index.html'),
      join(outputDirPath, '2026', '1-spring', 'index.html'),
      join(outputDirPath, '2026', '2-summer', 'index.html'),
      join(outputDirPath, '2026', '3-fall', 'index.html'),
    ]

    for (const path of expectedRefreshedPaths) {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, '')
      utimesSync(path, preRunTime, preRunTime)
    }

    refreshHierarchyIndexes(outputDirPath, listings, slotsWithRenderedEvents, slotsWithPrunedEvents)

    for (const path of expectedRefreshedPaths) {
      assert.ok(
        statSync(path).mtimeMs > preRunTime.getTime(),
        `expected ${path} mtime to advance — file was not re-rendered`,
      )
    }
  })

  describe('when no seasons were rendered or pruned', () => {
    it('writes nothing — every child renderer is skipped', () => {
      refreshHierarchyIndexes(outputDirPath, [], [], [])

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
