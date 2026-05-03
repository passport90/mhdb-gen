import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import type Controller from '../../src/types/controller.js'
import { DatabaseSync } from 'node:sqlite'
import type EventSlot from '../../src/types/event-slot.js'
import type EventToRender from '../../src/types/event-to-render.js'
import { PassThrough } from 'node:stream'
import { SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('sync', () => {
  /** Output directory pinned for the test, exposed via `MHDB_OUTPUT` per `beforeEach`. */
  const outputDir = '/tmp/mhdb-output-test-fixture'

  /** Hydrated event returned by the mocked `findEventById` when called with id 1. */
  const theEvent: EventToRender = {
    id: 1,
    slug: 'the-event',
    title: 'The Event',
    description: '\nbody\n',
    illustrationHash: 'hash-1',
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    seasonalYear: 2026,
    season: 1,
    position: 1,
  }

  /** Distinct seasons the rendered event occupies; expected `seasonsRendered` argument to refresh. */
  const expectedSeasonsRendered: SeasonalSlot[] = [
    { seasonalYear: 2026, season: 1 },
  ]

  /** Canned pruned seasons returned by the mocked `pruneOrphanOutput`. */
  const seasonsPruned: SeasonalSlot[] = [
    { seasonalYear: 2025, season: 3 },
  ]

  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle the mocked `runWithDatabase` threads into the controller body. */
  let db: DatabaseSync

  /** Mock for `runWithDatabase`; configured to invoke its body with the real `db`. */
  let runWithDatabaseMock: ReturnType<typeof mock.fn>

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

  /**
   * Inserts a stale row into `events` at the given slot with the given slug. The
   * default `rendered_at` of `null` is what flips `isDbStale` to true in the real
   * candidate query, so the controller's render loop picks the row up.
   *
   * @param slot - Slot stored in the row's `(seasonal_year, season, position)` columns.
   * @param slug - Slug stored in the row.
   */
  const insertEventRow = (slot: EventSlot, slug: string): void => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      slug,
      'Title',
      'body',
      '2026-01-01',
      '2026-12-31',
      slot.seasonalYear,
      slot.season,
      slot.position,
    )
  }

  beforeEach(async () => {
    messageStream = new PassThrough()
    process.env.MHDB_OUTPUT = outputDir

    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    process.env.MHDB_DB_PATH = dbPath
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    insertEventRow({ seasonalYear: 2026, season: 1, position: 1 }, 'the-event')

    runWithDatabaseMock = mock.fn((body: (db: unknown) => unknown) => body(db))
    findEventByIdMock = mock.fn(() => theEvent)
    renderEventMock = mock.fn()
    markRenderedMock = mock.fn()
    pruneOrphanOutputMock = mock.fn(() => seasonsPruned)
    refreshHierarchyIndexesMock = mock.fn()
    syncStaticAssetsMock = mock.fn()

    mock.module('../../src/helpers/run-with-database.js', { defaultExport: runWithDatabaseMock })
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
    delete process.env.MHDB_DB_PATH
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
    mock.restoreAll()
  })

  it('orchestrates the sync pipeline — render, mark, prune, refresh, mirror — and returns SUCCESS_EXIT_CODE', () => {
    /** Exit code returned by `sync`. */
    const code = sync([], messageStream)

    assert.strictEqual(messageStream.read()?.toString(), '[1/1] the-event\n')

    assert.strictEqual(runWithDatabaseMock.mock.callCount(), 1)

    assert.strictEqual(findEventByIdMock.mock.callCount(), 1)
    assert.deepStrictEqual(findEventByIdMock.mock.calls[0].arguments, [db, 1])

    assert.strictEqual(renderEventMock.mock.callCount(), 1)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [theEvent, outputDir])

    assert.strictEqual(markRenderedMock.mock.callCount(), 1)
    assert.deepStrictEqual(markRenderedMock.mock.calls[0].arguments, [db, 1])

    assert.strictEqual(pruneOrphanOutputMock.mock.callCount(), 1)
    assert.deepStrictEqual(pruneOrphanOutputMock.mock.calls[0].arguments, [db, outputDir])

    assert.strictEqual(refreshHierarchyIndexesMock.mock.callCount(), 1)
    assert.deepStrictEqual(
      refreshHierarchyIndexesMock.mock.calls[0].arguments,
      [db, outputDir, expectedSeasonsRendered, seasonsPruned],
    )

    assert.strictEqual(syncStaticAssetsMock.mock.callCount(), 1)
    assert.deepStrictEqual(syncStaticAssetsMock.mock.calls[0].arguments, [outputDir])

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })
})
