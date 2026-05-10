import { afterEach, beforeEach, describe, it } from 'node:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventToRender from '../../src/types/event-to-render.js'
import { PassThrough } from 'node:stream'
import { SUCCESS_EXIT_CODE } from '../../src/constants/exit-codes.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import sync from '../../src/controllers/sync.js'
import { tmpdir } from 'node:os'

describe('sync', () => {
  /** Seeded event; expected to flow through the full real chain into a written page on disk. */
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
    updatedAt: '2026-05-05 12:00:00',
  }

  /** Tmp directory created fresh per test; encloses the SQLite file and the output root. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Output root for the test, exposed via `MHDB_OUTPUT_DIR_PATH`; created per-test under `tmpDirPath`. */
  let outputDirPath: string

  /** Test-side database handle, used to seed the row and read back side effects; separate from the SUT's. */
  let db: DatabaseSync

  /** Message stream, reset per test. */
  let messageStream: PassThrough

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

  beforeEach(() => {
    messageStream = new PassThrough()

    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    outputDirPath = join(tmpDirPath, 'output')

    /** Asset source root, seeded with one stub file the real `syncStaticAssets` should mirror. */
    const assetsDirPath = join(tmpDirPath, 'src-assets')
    mkdirSync(assetsDirPath, { recursive: true })
    writeFileSync(join(assetsDirPath, 'style.css'), '/* stub */')

    /** Blob store sibling to the SQLite file; seeded with the event's illustration source bytes. */
    const blobDirPath = `${dbPath}.blobs`
    mkdirSync(blobDirPath, { recursive: true })
    writeFileSync(join(blobDirPath, `${theEvent.slug}.png`), 'illustration-bytes')

    process.env.MHDB_DB_PATH = dbPath
    process.env.MHDB_OUTPUT_DIR_PATH = outputDirPath
    process.env.MHDB_ASSETS_DIR_PATH = assetsDirPath
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    insertEventRow(theEvent)

    /** Orphan slug-dir seeded under `outputDirPath` so the real prune has something to remove. */
    mkdirSync(join(outputDirPath, '2024', '0', 'orphan-leftover'), { recursive: true })
  })

  afterEach(() => {
    delete process.env.MHDB_OUTPUT_DIR_PATH
    delete process.env.MHDB_DB_PATH
    delete process.env.MHDB_ASSETS_DIR_PATH
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('runs the full pipeline — event page, prune orphan, index pages, static assets — returns SUCCESS', () => {
    /** Exit code returned by `sync`. */
    const code = sync([], messageStream)

    assert.strictEqual(messageStream.read()?.toString(), '[1/1] the-event\n')

    /** Rendered event page on disk. */
    const eventPageHtml = readFileSync(
      join(outputDirPath, '2026', '1', 'the-event', 'index.html'),
      'utf8',
    )
    assert.ok(eventPageHtml.includes('<title>The Event - MHDB</title>'))

    /** Illustration copied alongside the event page. */
    assert.strictEqual(
      readFileSync(join(outputDirPath, '2026', '1', 'the-event', 'illustration.png'), 'utf8'),
      'illustration-bytes',
    )

    /** Stamped `rendered_at` on the event row, asserted as a side effect of real `markRendered`. */
    const row = db.prepare('SELECT rendered_at FROM events WHERE id = ?').get(1)
    assert.ok(row !== undefined)
    assert.notStrictEqual(row.rendered_at, null)

    /** The specific orphan slug-dir was removed by the real prune. */
    assert.ok(!existsSync(join(outputDirPath, '2024', '0', 'orphan-leftover')))

    /** Index pages produced by the real refresh chain. */
    assert.ok(existsSync(join(outputDirPath, 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', 'index.html')))
    assert.ok(existsSync(join(outputDirPath, '2026', '1', 'index.html')))

    /** Static asset mirrored from the source dir. */
    assert.strictEqual(readFileSync(join(outputDirPath, 'style.css'), 'utf8'), '/* stub */')

    assert.strictEqual(code, SUCCESS_EXIT_CODE)
  })
})
