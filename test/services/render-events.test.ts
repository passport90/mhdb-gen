import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventToRender from '../../src/types/event-to-render.js'
import { PassThrough } from 'node:stream'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderEvents', () => {
  /** Output root pinned for the test, threaded through to the mocked `renderEvent`. */
  const outputDir = '/tmp/mhdb-output-test-fixture'

  /** First seeded event; expected to land at id 1 via autoincrement. */
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

  /** Second seeded event; same slot as `firstEvent`, different position — exercises slot-dedup. */
  const firstEventSibling: EventToRender = {
    id: 2,
    slug: 'first-event-sibling',
    title: 'First Event Sibling',
    description: '\nbody-1b\n',
    illustrationHash: null,
    startDate: '2026-04-23',
    endDate: '2026-04-30',
    seasonalYear: 2026,
    season: 1,
    position: 2,
  }

  /** Third seeded event; different slot — produces a second `SeasonalSlot` entry. */
  const secondEvent: EventToRender = {
    id: 3,
    slug: 'second-event',
    title: 'Second Event',
    description: '\nbody-2\n',
    illustrationHash: null,
    startDate: '2026-05-05',
    endDate: '2026-05-12',
    seasonalYear: 2026,
    season: 2,
    position: 4,
  }

  /** Tmp directory created fresh per test; holds the test SQLite file. */
  let tmpDir: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Database handle threaded into the SUT. */
  let db: DatabaseSync

  /** Mock for `renderEvent`. */
  let renderEventMock: ReturnType<typeof mock.fn>

  /** Message stream, reset per test. */
  let messageStream: PassThrough

  /** SUT, dynamically re-imported per test so the static imports resolve through the mocked loader. */
  let renderEvents: (
    db: DatabaseSync,
    ids: number[],
    outputDir: string,
    messageStream: PassThrough,
  ) => SeasonalSlot[]

  /**
   * Inserts an event row carrying every field `findEventById` hydrates.
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

    tmpDir = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDir, 'test.sqlite')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    insertEventRow(firstEvent)
    insertEventRow(firstEventSibling)
    insertEventRow(secondEvent)

    renderEventMock = mock.fn()

    mock.module('../../src/services/render-event.js', { defaultExport: renderEventMock })

    renderEvents = (await import('../../src/services/render-events.js')).default
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
    mock.restoreAll()
  })

  it('renders each event in id order, dedupes seasons across same-slot events, returns distinct slots', () => {
    /** Distinct seasons returned by the SUT. */
    const seasonsRendered = renderEvents(db, [1, 2, 3], outputDir, messageStream)

    assert.strictEqual(
      messageStream.read()?.toString(),
      '[1/3] first-event\n[2/3] first-event-sibling\n[3/3] second-event\n',
    )

    assert.strictEqual(renderEventMock.mock.callCount(), 3)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [firstEvent, outputDir])
    assert.deepStrictEqual(renderEventMock.mock.calls[1].arguments, [firstEventSibling, outputDir])
    assert.deepStrictEqual(renderEventMock.mock.calls[2].arguments, [secondEvent, outputDir])

    /** Stamped `rendered_at` for every event row, asserted as a side effect of real `markRendered`. */
    const renderedAtById = db.prepare('SELECT id, rendered_at FROM events ORDER BY id').all()
    assert.strictEqual(renderedAtById.length, 3)
    assert.notStrictEqual(renderedAtById[0]?.rendered_at, null)
    assert.notStrictEqual(renderedAtById[1]?.rendered_at, null)
    assert.notStrictEqual(renderedAtById[2]?.rendered_at, null)

    /** Distinct (year, season) slots — three events live across two seasons; dedup collapses to two. */
    const expectedSeasonsRendered: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
    ]

    assert.deepStrictEqual(seasonsRendered, expectedSeasonsRendered)
  })
})
