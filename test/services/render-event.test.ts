import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import type EventToRender from '../../src/types/event-to-render.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderEvent from '../../src/services/render-event.js'
import { tmpdir } from 'node:os'

describe('renderEvent', () => {
  /** Tmp directory created fresh per test; holds the output tree and the blob store. */
  let tmpDirPath: string

  /** Output root passed to the SUT; the SUT's `mkdirSync` creates it lazily. */
  let outputDirPath: string

  beforeEach(() => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('writes the page and copies the illustration to <outputDirPath>/<year>/<season>/<position>-<slug>/', () => {
    /** Path to the test SQLite file (file itself never created); used to derive the blob dir. */
    const dbPath = join(tmpDirPath, 'test.sqlite')

    /** Blob store sibling to the SQLite file. */
    const blobDirPath = `${dbPath}.blobs`

    /** Source blob seeded for this test. */
    const sourceBlobPath = join(blobDirPath, 'battle-of-hastings.png')

    mkdirSync(blobDirPath, { recursive: true })
    writeFileSync(sourceBlobPath, 'illustration-bytes')
    process.env.MHDB_DB_PATH = dbPath

    /** Event with an illustration; exercises the copy branch. */
    const event: EventToRender = {
      id: 7,
      slug: 'battle-of-hastings',
      title: 'Battle of Hastings',
      description: 'body',
      illustrationHash: 'a1b2c3',
      startDate: '1066-10-14',
      endDate: '1066-10-14',
      seasonalYear: 1066,
      season: 3,
      position: 2,
      updatedAt: '2026-05-05 12:00:00',
    }

    /** Stand-in for the previous in-season event; threaded through to the rendered page. */
    const prevEvent: EventToRender = {
      ...event,
      id: 6,
      slug: 'norman-prologue',
      title: 'Norman Prologue',
      position: 1,
    }

    /** Stand-in for the next in-season event; threaded through to the rendered page. */
    const nextEvent: EventToRender = {
      ...event,
      id: 8,
      slug: 'aftermath',
      title: 'Aftermath',
      position: 3,
    }

    renderEvent(event, prevEvent, nextEvent, outputDirPath)

    /** Rendered page on disk. */
    const pageHtml = readFileSync(
      join(outputDirPath, '1066', '3', '2-battle-of-hastings', 'index.html'),
      'utf8',
    )

    /** Expected anchor for the previous-event link in the entry nav. */
    const expectedPrevAnchor = '<a class="entry-nav-link" '
      + 'href="1066/3/1-norman-prologue/index.html">← Norman Prologue</a>'

    /** Expected anchor for the next-event link in the entry nav. */
    const expectedNextAnchor = '<a class="entry-nav-link" '
      + 'href="1066/3/3-aftermath/index.html">Aftermath →</a>'

    assert.ok(pageHtml.includes('<title>Battle of Hastings - MHDB</title>'))
    assert.ok(pageHtml.includes(expectedPrevAnchor))
    assert.ok(pageHtml.includes(expectedNextAnchor))
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', '3', '2-battle-of-hastings', 'illustration.png'), 'utf8'),
      'illustration-bytes',
    )
  })

  describe('when the event has no illustration', () => {
    it('writes only index.html, skipping the illustration copy', () => {
      /** Event without an illustration; exercises the skip branch. */
      const event: EventToRender = {
        id: 1,
        slug: 'fall-of-rome',
        title: 'Fall of Rome',
        description: 'body',
        illustrationHash: null,
        startDate: '2026-04-15',
        endDate: '2026-04-22',
        seasonalYear: 2026,
        season: 1,
        position: 1,
        updatedAt: '2026-05-05 12:00:00',
      }

      renderEvent(event, null, null, outputDirPath)

      assert.ok(existsSync(join(outputDirPath, '2026', '1', '1-fall-of-rome', 'index.html')))
      assert.strictEqual(
        existsSync(join(outputDirPath, '2026', '1', '1-fall-of-rome', 'illustration.png')),
        false,
      )
    })
  })
})
