import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import type EventListing from '../../src/types/event-listing.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
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

  it('renders the root index plus every touched year and slot index, deduping years across slots', () => {
    /**
     * Listings the SUT threads into every child renderer; covers the three touched slots so
     * each season-index renderer projects a non-empty timeline.
     */
    const listings: EventListing[] = [
      {
        id: 1,
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
        id: 2,
        title: 'Spring Event',
        slug: 'spring-event',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
        seasonalYear: 2026,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-04-01 00:00:00',
      },
      {
        id: 3,
        title: 'Summer Event',
        slug: 'summer-event',
        startDate: '2026-07-01',
        endDate: '2026-07-08',
        seasonalYear: 2026,
        season: 2,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-07-01 00:00:00',
      },
    ]

    /** Two slots in 2026 each containing a freshly rendered event. */
    const slotsWithRenderedEvents: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
    ]

    /** One slot in 1066 whose orphan event output was pruned this run — orchestrator should refresh its indexes too. */
    const slotsWithPrunedEvents: SeasonalSlot[] = [
      { seasonalYear: 1066, season: 3 },
    ]

    refreshHierarchyIndexes(outputDirPath, listings, slotsWithRenderedEvents, slotsWithPrunedEvents)

    assert.ok(existsSync(join(outputDirPath, 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '1066', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '1066', '3-fall', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', '1-spring', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', '2-summer', 'index.html')))
  })

  describe('when no seasons were rendered or pruned', () => {
    it('writes nothing — every child renderer is skipped', () => {
      refreshHierarchyIndexes(outputDirPath, [], [], [])

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
