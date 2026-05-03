import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import type Controller from '../../src/types/controller.js'
import type EventRenderCandidate from '../../src/types/event-render-candidate.js'
import type EventToRender from '../../src/types/event-to-render.js'
import { PassThrough } from 'node:stream'
import { SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'

describe('sync', () => {
  /** Output directory pinned for the test, exposed via `MHDB_OUTPUT` per `beforeEach`. */
  const outputDir = '/tmp/mhdb-output-test-fixture'

  /**
   * Candidates returned by the mocked repo; both are flagged db-stale so the real
   * `findEventIdsToRender` service includes both regardless of folder presence.
   */
  const candidates: EventRenderCandidate[] = [
    { id: 1, slug: 'first-event', seasonalYear: 2026, season: 1, isDbStale: true },
    { id: 2, slug: 'second-event', seasonalYear: 2026, season: 2, isDbStale: true },
  ]

  /** Hydrated event for id=1, returned by the mocked `findEventById` when called with id 1. */
  const firstEvent: EventToRender = {
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
  }

  /** Hydrated event for id=2, returned by the mocked `findEventById` when called with id 2. */
  const secondEvent: EventToRender = {
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
  }

  /** Distinct seasons the rendered events occupy; expected `seasonsRendered` argument to refresh. */
  const expectedSeasonsRendered: SeasonalSlot[] = [
    { seasonalYear: 2026, season: 1 },
    { seasonalYear: 2026, season: 2 },
  ]

  /** Canned pruned seasons returned by the mocked `pruneOrphanOutput`. */
  const seasonsPruned: SeasonalSlot[] = [
    { seasonalYear: 2025, season: 4 },
  ]

  /** Sentinel `db` handle threaded by the mocked `runWithDatabase`; the mocked repos only forward it. */
  const fakeDb = { __sentinel: 'db' }

  /** Mock for `runWithDatabase`; configured to invoke its body with `fakeDb`. */
  let runWithDatabaseMock: ReturnType<typeof mock.fn>

  /** Mock for `findEventRenderCandidates` — the lowest-level seam still hollow at this point in the descent. */
  let findEventRenderCandidatesMock: ReturnType<typeof mock.fn>

  /** Mock for `findEventById`; routes by id to return the canned hydrated event. */
  let findEventByIdMock: ReturnType<typeof mock.fn>

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
    findEventRenderCandidatesMock = mock.fn(() => candidates)
    findEventByIdMock = mock.fn((_db: unknown, id: number) => {
      if (id === 1) return firstEvent
      if (id === 2) return secondEvent
      throw new Error(`findEventByIdMock: unexpected id ${id}`)
    })
    renderEventMock = mock.fn()
    markRenderedMock = mock.fn()
    pruneOrphanOutputMock = mock.fn(() => seasonsPruned)
    refreshHierarchyIndexesMock = mock.fn()
    syncStaticAssetsMock = mock.fn()

    mock.module('../../src/helpers/run-with-database.js', { defaultExport: runWithDatabaseMock })
    mock.module(
      '../../src/repositories/find-event-render-candidates.js',
      { defaultExport: findEventRenderCandidatesMock },
    )
    mock.module('../../src/repositories/find-event-by-id.js', { defaultExport: findEventByIdMock })
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

    assert.strictEqual(findEventRenderCandidatesMock.mock.callCount(), 1)
    assert.deepStrictEqual(findEventRenderCandidatesMock.mock.calls[0].arguments, [fakeDb])

    assert.strictEqual(findEventByIdMock.mock.callCount(), 2)
    assert.deepStrictEqual(findEventByIdMock.mock.calls[0].arguments, [fakeDb, 1])
    assert.deepStrictEqual(findEventByIdMock.mock.calls[1].arguments, [fakeDb, 2])

    assert.strictEqual(renderEventMock.mock.callCount(), 2)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [firstEvent, outputDir])
    assert.deepStrictEqual(renderEventMock.mock.calls[1].arguments, [secondEvent, outputDir])

    assert.strictEqual(markRenderedMock.mock.callCount(), 2)
    assert.deepStrictEqual(markRenderedMock.mock.calls[0].arguments, [fakeDb, 1])
    assert.deepStrictEqual(markRenderedMock.mock.calls[1].arguments, [fakeDb, 2])

    assert.strictEqual(pruneOrphanOutputMock.mock.callCount(), 1)
    assert.deepStrictEqual(pruneOrphanOutputMock.mock.calls[0].arguments, [fakeDb, outputDir])

    assert.strictEqual(refreshHierarchyIndexesMock.mock.callCount(), 1)
    assert.deepStrictEqual(
      refreshHierarchyIndexesMock.mock.calls[0].arguments,
      [fakeDb, outputDir, expectedSeasonsRendered, seasonsPruned],
    )

    assert.strictEqual(syncStaticAssetsMock.mock.callCount(), 1)
    assert.deepStrictEqual(syncStaticAssetsMock.mock.calls[0].arguments, [outputDir])

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })
})
