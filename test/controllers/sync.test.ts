import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

  /**
   * Slot of the orphan directory seeded under `outputDirPath`; real `pruneOrphanOutput`
   * should remove it and report this slot as touched.
   */
  const expectedSeasonsPruned: SeasonalSlot[] = [
    { seasonalYear: 2024, season: 0 },
  ]

  /** Tmp directory created fresh per test; encloses the SQLite file and the output root. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Output root for the test, exposed via `MHDB_OUTPUT_DIR_PATH`; created per-test under `tmpDirPath`. */
  let outputDirPath: string

  /** Test-side database handle, used to seed the row and read back side effects; separate connection from the SUT's. */
  let db: DatabaseSync

  /** Mock for `renderEvent`. */
  let renderEventMock: ReturnType<typeof mock.fn>

  /** Mock for `refreshHierarchyIndexes`. */
  let refreshHierarchyIndexesMock: ReturnType<typeof mock.fn>

  /** Message stream, reset per test. */
  let messageStream: PassThrough

  /** SUT, dynamically re-imported per test so the static imports resolve through the mocked loader. */
  let sync: Controller

  /**
   * Inserts an event row carrying every field `findEventById` hydrates, leaving
   * `rendered_at` at its column default of `null` so the row qualifies for rendering.
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

    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    outputDirPath = join(tmpDirPath, 'output')

    /** Asset source root, seeded with one stub file the real `syncStaticAssets` should mirror. */
    const assetsDirPath = join(tmpDirPath, 'src-assets')
    mkdirSync(assetsDirPath, { recursive: true })
    writeFileSync(join(assetsDirPath, 'style.css'), '/* stub */')

    process.env.MHDB_DB_PATH = dbPath
    process.env.MHDB_OUTPUT_DIR_PATH = outputDirPath
    process.env.MHDB_ASSETS_DIR_PATH = assetsDirPath
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    insertEventRow(theEvent)

    /** Orphan slug-dir seeded under `outputDirPath` so the real prune has something to remove. */
    mkdirSync(join(outputDirPath, '2024', '0', 'orphan-leftover'), { recursive: true })

    renderEventMock = mock.fn()
    refreshHierarchyIndexesMock = mock.fn()

    mock.module('../../src/services/render-event.js', { defaultExport: renderEventMock })
    mock.module(
      '../../src/services/refresh-hierarchy-indexes.js',
      { defaultExport: refreshHierarchyIndexesMock },
    )

    sync = (await import('../../src/controllers/sync.js')).default
  })

  afterEach(() => {
    delete process.env.MHDB_OUTPUT_DIR_PATH
    delete process.env.MHDB_DB_PATH
    delete process.env.MHDB_ASSETS_DIR_PATH
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
    mock.restoreAll()
  })

  it('orchestrates the sync pipeline — render, mark, prune, refresh, mirror — and returns SUCCESS_EXIT_CODE', () => {
    /** Exit code returned by `sync`. */
    const code = sync([], messageStream)

    assert.strictEqual(messageStream.read()?.toString(), '[1/1] the-event\n')

    assert.strictEqual(renderEventMock.mock.callCount(), 1)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [theEvent, outputDirPath])

    /** Stamped `rendered_at` on the event row, asserted as a side effect of real `markRendered`. */
    const row = db.prepare('SELECT rendered_at FROM events WHERE id = ?').get(1)
    assert.ok(row !== undefined)
    assert.notStrictEqual(row.rendered_at, null)

    assert.ok(!existsSync(join(outputDirPath, '2024')))

    assert.strictEqual(refreshHierarchyIndexesMock.mock.callCount(), 1)
    /** Args passed to `refreshHierarchyIndexes`; the SUT's internal db handle isn't compared by identity. */
    const refreshArgs = refreshHierarchyIndexesMock.mock.calls[0].arguments
    assert.strictEqual(refreshArgs[1], outputDirPath)
    assert.deepStrictEqual(refreshArgs[2], expectedSeasonsRendered)
    assert.deepStrictEqual(refreshArgs[3], expectedSeasonsPruned)

    assert.strictEqual(readFileSync(join(outputDirPath, 'style.css'), 'utf8'), '/* stub */')

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })
})
