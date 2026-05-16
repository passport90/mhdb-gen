import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type EventListing from '../../src/types/event-listing.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderRootIndex from '../../src/services/render-root-index.js'
import { tmpdir } from 'node:os'

describe('renderRootIndex', () => {
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

  it('writes the root index to <outputDirPath>/index.html, with year cells reflecting the listings', () => {
    /**
     * Two listings in years 1066 and 2026 — the SUT should derive decade rows for the 1060s
     * and 2020s and place cells at those years.
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
        title: 'Future Event',
        slug: 'future-event',
        startDate: '2026-04-01',
        endDate: '2026-04-08',
        seasonalYear: 2026,
        season: 1,
        position: 1,
        renderedAt: null,
        updatedAt: '2026-04-01 00:00:00',
      },
    ]

    renderRootIndex(outputDirPath, listings)

    /** Rendered root index on disk. */
    const indexHtml = readFileSync(join(outputDirPath, 'index.html'), 'utf8')
    assert.ok(indexHtml.includes('<title>MHDB</title>'))
    assert.ok(indexHtml.includes('<th scope="row">1060s</th>'))
    assert.ok(indexHtml.includes('<a href="1066/index.html">1066</a>'))
    assert.ok(indexHtml.includes('<th scope="row">2020s</th>'))
    assert.ok(indexHtml.includes('<a href="2026/index.html">2026</a>'))
  })
})
