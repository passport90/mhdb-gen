import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type EventListing from '../../src/types/event-listing.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderYearIndex from '../../src/services/render-year-index.js'
import { tmpdir } from 'node:os'

describe('renderYearIndex', () => {
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

  it('writes the year index page to <outputDirPath>/<year>/index.html with seasons + nav from the listings', () => {
    /**
     * Listings cover years 1065, 1066 (two seasons), and 1067 — the SUT renders 1066 with
     * seasons 1 and 3 populated, 0 and 2 empty, and prev/next links to 1065 and 1067.
     */
    const listings: EventListing[] = [
      {
        id: 1,
        title: 'Earlier Year',
        slug: 'earlier-year',
        startDate: '1065-04-01',
        endDate: '1065-04-08',
        seasonalYear: 1065,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '1065-04-01 00:00:00',
      },
      {
        id: 2,
        title: 'Target Spring',
        slug: 'target-spring',
        startDate: '1066-04-01',
        endDate: '1066-04-08',
        seasonalYear: 1066,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-04-01 00:00:00',
      },
      {
        id: 3,
        title: 'Target Fall',
        slug: 'target-fall',
        startDate: '1066-10-14',
        endDate: '1066-10-14',
        seasonalYear: 1066,
        season: 3,
        position: 1,
        renderedAt: null,
        updatedAt: '1066-10-01 00:00:00',
      },
      {
        id: 4,
        title: 'Later Year',
        slug: 'later-year',
        startDate: '1067-04-01',
        endDate: '1067-04-08',
        seasonalYear: 1067,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '1067-04-01 00:00:00',
      },
    ]

    renderYearIndex(outputDirPath, 1066, listings)

    /** Rendered year index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, '1066', 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>Seasons 1066 - MHDB</title>'))
    assert.ok(indexHtml.includes('<a class="season-card" data-season="1" href="1066/1-spring/index.html">'))
    assert.ok(indexHtml.includes('<a class="season-card" data-season="3" href="1066/3-fall/index.html">'))
    assert.ok(indexHtml.includes('<span class="season-card season-card-empty" data-season="0">'))
    assert.ok(indexHtml.includes('<span class="season-card season-card-empty" data-season="2">'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1065/index.html">← 1065</a>'))
    assert.ok(indexHtml.includes('<a class="season-nav-link" href="1067/index.html">1067 →</a>'))
  })

  describe('when the year has no events in the listings', () => {
    it('writes nothing — leaves the output tree as the upstream prune left it', () => {
      renderYearIndex(outputDirPath, 1066, [])

      assert.ok(!existsSync(outputDirPath))
    })
  })
})
