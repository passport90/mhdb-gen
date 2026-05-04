import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import type Controller from '../../src/types/controller.js'
import { DatabaseSync } from 'node:sqlite'
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

  /**
   * Seeded event; expected to flow through real `findEventIdsToRender` + real `findEventById`
   * into the mocked `renderEvent`.
   */
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

  /** Test-side database handle, used to seed the row and read back side effects; separate connection from the SUT's. */
  let db: DatabaseSync

  /** Mock for `renderEvent`. */
  let renderEventMock: ReturnType<typeof mock.fn>

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
   * Inserts an event row carrying every field `findEventById` hydrates. The default
   * `rendered_at` of `null` is what flips `isDbStale` to true in the candidate query,
   * so the row is picked up for rendering.
   *
   * @param event - Event whose fields populate the row; the surrogate id is set by autoincrement.
   */
  const insertEventRow = (event: EventToRender): void => {
    db.prepare(`
      INSERT INTO events (
        slug, title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.slug,
      event.title,
      event.description,
      event.illustrationHash,
      event.startDate,
      event.endDate,
      event.seasonalYear,
      event.season,
      event.position,
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

    insertEventRow(theEvent)

    renderEventMock = mock.fn()
    pruneOrphanOutputMock = mock.fn(() => seasonsPruned)
    refreshHierarchyIndexesMock = mock.fn()
    syncStaticAssetsMock = mock.fn()

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

    assert.strictEqual(renderEventMock.mock.callCount(), 1)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [theEvent, outputDir])

    /** Stamped `rendered_at` on the event row, asserted as a side effect of real `markRendered`. */
    const row = db.prepare('SELECT rendered_at FROM events WHERE id = ?').get(1)
    assert.ok(row !== undefined)
    assert.notStrictEqual(row.rendered_at, null)

    assert.strictEqual(pruneOrphanOutputMock.mock.callCount(), 1)
    /** Args passed to `pruneOrphanOutput`; the `db` handle is the SUT's internal one and isn't compared by identity. */
    const pruneArgs = pruneOrphanOutputMock.mock.calls[0].arguments
    assert.strictEqual(pruneArgs[1], outputDir)

    assert.strictEqual(refreshHierarchyIndexesMock.mock.callCount(), 1)
    /** Args passed to `refreshHierarchyIndexes`; same db-identity caveat as `pruneArgs`. */
    const refreshArgs = refreshHierarchyIndexesMock.mock.calls[0].arguments
    assert.strictEqual(refreshArgs[1], outputDir)
    assert.deepStrictEqual(refreshArgs[2], expectedSeasonsRendered)
    assert.deepStrictEqual(refreshArgs[3], seasonsPruned)

    assert.strictEqual(syncStaticAssetsMock.mock.callCount(), 1)
    assert.deepStrictEqual(syncStaticAssetsMock.mock.calls[0].arguments, [outputDir])

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })
})
