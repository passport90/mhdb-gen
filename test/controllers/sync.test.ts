import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import type Controller from '../../src/types/controller.js'
import type EventToRender from '../../src/types/event-to-render.js'
import { PassThrough } from 'node:stream'
import { SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import type SeasonKey from '../../src/types/season-key.js'
import assert from 'node:assert/strict'

describe('sync', () => {
  /** Output directory pinned for the test, exposed via `MHDB_OUTPUT` per `beforeEach`. */
  const outputDir = '/tmp/mhdb-output-test-fixture'

  /** Canned events returned by the mocked `findEventsToRender`. */
  const eventsToRender: EventToRender[] = [
    {
      id: 1,
      slug: 'first-event',
      title: 'First Event',
      description: '\nbody-1\n',
      illustrationHash: 'hash-1',
      startDate: '2026-04-15',
      endDate: '2026-04-22',
      seasonalYear: 2026,
      season: 1,
      position: 1,
    },
    {
      id: 2,
      slug: 'second-event',
      title: 'Second Event',
      description: '\nbody-2\n',
      illustrationHash: null,
      startDate: '2026-04-23',
      endDate: '2026-04-30',
      seasonalYear: 2026,
      season: 2,
      position: 4,
    },
  ]

  /** Canned pruned seasons returned by the mocked `pruneOrphanOutput`. */
  const seasonsPruned: SeasonKey[] = [
    { seasonalYear: 2025, season: 4 },
  ]

  /** Sentinel `db` handle threaded by the mocked `runWithDatabase`; leaves only forward it. */
  const fakeDb = { __sentinel: 'db' }

  /** Mock for `runWithDatabase`; configured to invoke its body with `fakeDb`. */
  let runWithDatabaseMock: ReturnType<typeof mock.fn>

  /** Mock for `findEventsToRender`. */
  let findEventsToRenderMock: ReturnType<typeof mock.fn>

  /** Mock for `renderEvent`. */
  let renderEventMock: ReturnType<typeof mock.fn>

  /** Mock for `markRendered`. */
  let markRenderedMock: ReturnType<typeof mock.fn>

  /** Mock for `pruneOrphanOutput`. */
  let pruneOrphanOutputMock: ReturnType<typeof mock.fn>

  /** Mock for `refreshHierarchyIndexes`. */
  let refreshHierarchyIndexesMock: ReturnType<typeof mock.fn>

  /** Mock for `syncStaticAssets`. */
  let syncStaticAssetsMock: ReturnType<typeof mock.fn>

  /** Message stream, reset per test. */
  let messageStream: PassThrough

  /** SUT, dynamically re-imported per test so the static imports resolve through the mocked loader. */
  let sync: Controller

  beforeEach(async () => {
    messageStream = new PassThrough()
    process.env.MHDB_OUTPUT = outputDir

    runWithDatabaseMock = mock.fn((body: (db: unknown) => unknown) => body(fakeDb))
    findEventsToRenderMock = mock.fn(() => eventsToRender)
    renderEventMock = mock.fn()
    markRenderedMock = mock.fn()
    pruneOrphanOutputMock = mock.fn(() => seasonsPruned)
    refreshHierarchyIndexesMock = mock.fn()
    syncStaticAssetsMock = mock.fn()

    mock.module('../../src/helpers/run-with-database.js', { defaultExport: runWithDatabaseMock })
    mock.module('../../src/repositories/find-events-to-render.js', { defaultExport: findEventsToRenderMock })
    mock.module('../../src/repositories/mark-rendered.js', { defaultExport: markRenderedMock })
    mock.module('../../src/services/render-event.js', { defaultExport: renderEventMock })
    mock.module('../../src/services/prune-orphan-output.js', { defaultExport: pruneOrphanOutputMock })
    mock.module(
      '../../src/services/refresh-hierarchy-indexes.js',
      { defaultExport: refreshHierarchyIndexesMock },
    )
    mock.module('../../src/services/sync-static-assets.js', { defaultExport: syncStaticAssetsMock })

    sync = (await import('../../src/controllers/sync.js')).default
  })

  afterEach(() => {
    delete process.env.MHDB_OUTPUT
    mock.restoreAll()
  })

  it('orchestrates the sync pipeline — render, mark, prune, refresh, mirror — and returns SUCCESS_EXIT_CODE', () => {
    /** Exit code returned by `sync`. */
    const code = sync([], messageStream)

    assert.strictEqual(messageStream.read()?.toString(), '[1/2] first-event\n[2/2] second-event\n')

    assert.strictEqual(runWithDatabaseMock.mock.callCount(), 1)

    assert.strictEqual(findEventsToRenderMock.mock.callCount(), 1)
    assert.deepStrictEqual(findEventsToRenderMock.mock.calls[0].arguments, [fakeDb, outputDir])

    assert.strictEqual(renderEventMock.mock.callCount(), 2)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [eventsToRender[0], outputDir])
    assert.deepStrictEqual(renderEventMock.mock.calls[1].arguments, [eventsToRender[1], outputDir])

    assert.strictEqual(markRenderedMock.mock.callCount(), 2)
    assert.deepStrictEqual(markRenderedMock.mock.calls[0].arguments, [fakeDb, 1])
    assert.deepStrictEqual(markRenderedMock.mock.calls[1].arguments, [fakeDb, 2])

    assert.strictEqual(pruneOrphanOutputMock.mock.callCount(), 1)
    assert.deepStrictEqual(pruneOrphanOutputMock.mock.calls[0].arguments, [fakeDb, outputDir])

    assert.strictEqual(refreshHierarchyIndexesMock.mock.callCount(), 1)
    assert.deepStrictEqual(
      refreshHierarchyIndexesMock.mock.calls[0].arguments,
      [fakeDb, outputDir, eventsToRender, seasonsPruned],
    )

    assert.strictEqual(syncStaticAssetsMock.mock.callCount(), 1)
    assert.deepStrictEqual(syncStaticAssetsMock.mock.calls[0].arguments, [outputDir])

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })
})
