import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import type EventPageViewModel from '../../src/types/event-page-view-model.js'
import type EventToRender from '../../src/types/event-to-render.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderEvent', () => {
  /** Sentinel view model returned by the mocked `buildEventViewModel`; identity-checked downstream. */
  const sentinelViewModel: EventPageViewModel = {
    title: 'sentinel',
    seasonalYear: 0,
    seasonLabel: 'sentinel',
    yearPath: 'sentinel',
    seasonPath: 'sentinel',
    illustration: null,
    dateRange: 'sentinel',
    descriptionHtml: 'sentinel',
    prevLink: null,
    nextLink: null,
    updatedAt: 'sentinel',
    rootBasePath: 'sentinel',
  }

  /** Tmp directory created fresh per test; holds the output tree and the blob store. */
  let tmpDirPath: string

  /** Output root passed to the SUT; the SUT's `mkdirSync` creates it lazily. */
  let outputDirPath: string

  /** Mock for `buildEventViewModel`; returns the sentinel view model. */
  let buildEventViewModelMock: ReturnType<typeof mock.fn>

  /** Mock for `buildEventPage`; returns a sentinel HTML string. */
  let buildEventPageMock: ReturnType<typeof mock.fn>

  /**
   * SUT, dynamically re-imported per test so the static imports of `buildEventViewModel` and
   * `buildEventPage` resolve through the mocked loader.
   */
  let renderEvent: (
    event: EventToRender,
    prev: EventToRender | null,
    next: EventToRender | null,
    outputDirPath: string,
  ) => void

  beforeEach(async () => {
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')

    buildEventViewModelMock = mock.fn(() => sentinelViewModel)
    buildEventPageMock = mock.fn(() => '<html>fake-page</html>')

    mock.module('../../src/services/build-event-view-model.js', { defaultExport: buildEventViewModelMock })
    mock.module('../../src/services/build-event-page.js', { defaultExport: buildEventPageMock })

    renderEvent = (await import('../../src/services/render-event.js')).default
  })

  afterEach(() => {
    delete process.env.MHDB_DB_PATH
    rmSync(tmpDirPath, { recursive: true, force: true })
    mock.restoreAll()
  })

  it('writes index.html and copies the illustration to <outputDirPath>/<year>/<season>/<slug>/', () => {
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
      position: 1,
      updatedAt: '2026-05-05 12:00:00',
    }

    /** Stand-in for the previous in-season event; threaded through to `buildEventViewModel`. */
    const prevEvent: EventToRender = { ...event, id: 6, slug: 'norman-prologue', title: 'Norman Prologue' }

    /** Stand-in for the next in-season event; threaded through to `buildEventViewModel`. */
    const nextEvent: EventToRender = { ...event, id: 8, slug: 'aftermath', title: 'Aftermath' }

    renderEvent(event, prevEvent, nextEvent, outputDirPath)

    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', '3', 'battle-of-hastings', 'index.html'), 'utf8'),
      '<html>fake-page</html>',
    )
    assert.strictEqual(buildEventViewModelMock.mock.callCount(), 1)
    assert.deepStrictEqual(buildEventViewModelMock.mock.calls[0].arguments, [event, prevEvent, nextEvent])
    assert.strictEqual(buildEventPageMock.mock.callCount(), 1)
    assert.deepStrictEqual(buildEventPageMock.mock.calls[0].arguments, [sentinelViewModel])
    assert.strictEqual(
      readFileSync(join(outputDirPath, '1066', '3', 'battle-of-hastings', 'illustration.png'), 'utf8'),
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

      assert.strictEqual(
        readFileSync(join(outputDirPath, '2026', '1', 'fall-of-rome', 'index.html'), 'utf8'),
        '<html>fake-page</html>',
      )
      assert.strictEqual(
        existsSync(join(outputDirPath, '2026', '1', 'fall-of-rome', 'illustration.png')),
        false,
      )
    })
  })
})
