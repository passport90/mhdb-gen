import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type EventListing from '../../src/types/event-listing.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderSeasonIndex from '../../src/services/render-season-index.js'
import { tmpdir } from 'node:os'

describe('renderSeasonIndex', () => {
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

  it('writes the season index to the slot folder, with timeline and adjacencies reflecting the listings', () => {
    /** Slot being rendered. */
    const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

    /**
     * Listings cover the rendered slot (1066, 1) with two events, an earlier slot
     * (1066, 0) for the prev link, and a later slot (1066, 2) for the next link.
     */
    const listings: EventListing[] = [
      {
        id: 9,
        title: 'Earlier Slot',
        slug: 'earlier-slot',
        startDate: '1066-01-01',
        endDate: '1066-01-02',
        seasonalYear: 1066,
        season: 0,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-01-01 00:00:00',
      },
      {
        id: 10,
        title: 'First Event',
        slug: 'first-event',
        startDate: '1066-04-15',
        endDate: '1066-04-22',
        seasonalYear: 1066,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
      {
        id: 11,
        title: 'Second Event',
        slug: 'second-event',
        startDate: '1066-04-23',
        endDate: '1066-04-30',
        seasonalYear: 1066,
        season: 1,
        position: 2,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
      {
        id: 12,
        title: 'Later Slot',
        slug: 'later-slot',
        startDate: '1066-07-01',
        endDate: '1066-07-02',
        seasonalYear: 1066,
        season: 2,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
    ]

    renderSeasonIndex(outputDirPath, slot, listings)

    /** Rendered season index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, '1066', '1-spring', 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>Spring 1066 - MHDB</title>'))
    assert.ok(indexHtml.includes('<a class="event-title" href="1066/1-spring/1-first-event/index.html">'
      + 'First Event</a>'))
    assert.ok(indexHtml.includes('<a class="event-title" href="1066/1-spring/2-second-event/index.html">'
      + 'Second Event</a>'))
    assert.ok(!indexHtml.includes('later-slot'))
    assert.ok(!indexHtml.includes('earlier-slot'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1066/0-winter/index.html">← Winter 1066</a>'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1066/2-summer/index.html">Summer 1066 →</a>'))
  })

  describe('when the slot has no events in the listings', () => {
    it('writes nothing — leaves the output tree as the upstream prune left it', () => {
      /** Slot being rendered; has zero entries in `listings`. */
      const slot: SeasonalSlot = { seasonalYear: 1066, season: 1 }

      renderSeasonIndex(outputDirPath, slot, [])

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
