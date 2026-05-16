import { afterEach, beforeEach, describe, it } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type EventBody from '../../src/types/event-body.js'
import type EventListing from '../../src/types/event-listing.js'
import type EventSlot from '../../src/types/event-slot.js'
import { PassThrough } from 'node:stream'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import applyMigrations from '../support/apply-migrations.js'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import renderEvents from '../../src/services/render-events.js'
import { tmpdir } from 'node:os'

describe('renderEvents', () => {
  /** Body fields for the first seeded event; expected to land at id 1 via autoincrement. */
  const firstEventBody: EventBody = {
    title: 'First Event',
    description: '\nbody-1\n',
    illustrationHash: null,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
  }

  /** Slot for the first seeded event. */
  const firstEventSlot: EventSlot = { seasonalYear: 2026, season: 1, position: 1 }

  /** Body fields for the same-slot sibling; exercises slot-dedup in the SUT. */
  const firstEventSiblingBody: EventBody = {
    title: 'First Event Sibling',
    description: '\nbody-1b\n',
    illustrationHash: null,
    startDate: '2026-04-23',
    endDate: '2026-04-30',
  }

  /** Slot for the same-slot sibling — same year and season, different position. */
  const firstEventSiblingSlot: EventSlot = { seasonalYear: 2026, season: 1, position: 2 }

  /** Body fields for the second seeded event; different slot — produces a second `SeasonalSlot` entry. */
  const secondEventBody: EventBody = {
    title: 'Second Event',
    description: '\nbody-2\n',
    illustrationHash: null,
    startDate: '2026-05-05',
    endDate: '2026-05-12',
  }

  /** Slot for the second seeded event. */
  const secondEventSlot: EventSlot = { seasonalYear: 2026, season: 2, position: 4 }

  /** Listings threaded into the SUT, paired with the seeded rows by id and carrying the pre-derived slug. */
  const listings: EventListing[] = [
    {
      id: 1,
      seasonalYear: 2026,
      season: 1,
      position: 1,
      slug: 'first-event',
      renderedAt: null,
      updatedAt: '2026-05-05 12:00:00',
    },
    {
      id: 2,
      seasonalYear: 2026,
      season: 1,
      position: 2,
      slug: 'first-event-sibling',
      renderedAt: null,
      updatedAt: '2026-05-05 12:00:00',
    },
    {
      id: 3,
      seasonalYear: 2026,
      season: 2,
      position: 4,
      slug: 'second-event',
      renderedAt: null,
      updatedAt: '2026-05-05 12:00:00',
    },
  ]

  /** Tmp directory created fresh per test; holds the test SQLite file and the output tree. */
  let tmpDirPath: string

  /** Path to the test SQLite file. */
  let dbPath: string

  /** Output root threaded into the SUT; receives one bundle per rendered event. */
  let outputDirPath: string

  /** Database handle threaded into the SUT. */
  let db: DatabaseSync

  /** Message stream, reset per test. */
  let messageStream: PassThrough

  /**
   * Inserts an event row by combining body fields with a slot. The surrogate id is set by
   * autoincrement; the `updated_at` column defaults at INSERT time.
   *
   * @param body - Heavy authored fields for the row.
   * @param slot - Identifying slot for the row.
   */
  const insertEventRow = (body: EventBody, slot: EventSlot): void => {
    db.prepare(`
      INSERT INTO events (
        title, description, illustration_hash,
        start_date, end_date,
        seasonal_year, season, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.title,
      body.description,
      body.illustrationHash,
      body.startDate,
      body.endDate,
      slot.seasonalYear,
      slot.season,
      slot.position,
    )
  }

  beforeEach(() => {
    messageStream = new PassThrough()

    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    dbPath = join(tmpDirPath, 'test.sqlite')
    outputDirPath = join(tmpDirPath, 'output')
    applyMigrations(dbPath)
    db = new DatabaseSync(dbPath)

    insertEventRow(firstEventBody, firstEventSlot)
    insertEventRow(firstEventSiblingBody, firstEventSiblingSlot)
    insertEventRow(secondEventBody, secondEventSlot)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('renders each event in listing order, dedupes seasons across same-slot events, returns distinct slots', () => {
    /** Distinct slots returned by the SUT. */
    const slotsWithRenderedEvents = renderEvents(db, listings, outputDirPath, messageStream)

    assert.strictEqual(
      messageStream.read()?.toString(),
      '[1/3] 1-first-event\n[2/3] 2-first-event-sibling\n[3/3] 4-second-event\n',
    )

    /** Rendered page for `firstEvent`; inspected for title and threaded next link. */
    const firstEventHtml = readFileSync(
      join(outputDirPath, '2026', '1-spring', '1-first-event', 'index.html'),
      'utf8',
    )
    assert.ok(firstEventHtml.includes('<title>First Event - MHDB</title>'))
    assert.ok(firstEventHtml.includes('href="2026/1-spring/2-first-event-sibling/index.html"'))

    /** Rendered page for `firstEventSibling`; inspected for title and threaded prev link. */
    const firstEventSiblingHtml = readFileSync(
      join(outputDirPath, '2026', '1-spring', '2-first-event-sibling', 'index.html'),
      'utf8',
    )
    assert.ok(firstEventSiblingHtml.includes('<title>First Event Sibling - MHDB</title>'))
    assert.ok(firstEventSiblingHtml.includes('href="2026/1-spring/1-first-event/index.html"'))

    /** Rendered page for `secondEvent`; inspected for title — different slot, no siblings threaded. */
    const secondEventHtml = readFileSync(
      join(outputDirPath, '2026', '2-summer', '4-second-event', 'index.html'),
      'utf8',
    )
    assert.ok(secondEventHtml.includes('<title>Second Event - MHDB</title>'))

    /** Stamped `rendered_at` for every event row, asserted as a side effect of real `markRendered`. */
    const renderedAtById = db.prepare('SELECT id, rendered_at FROM events ORDER BY id').all()
    assert.strictEqual(renderedAtById.length, 3)
    assert.notStrictEqual(renderedAtById[0]?.rendered_at, null)
    assert.notStrictEqual(renderedAtById[1]?.rendered_at, null)
    assert.notStrictEqual(renderedAtById[2]?.rendered_at, null)

    /** Distinct (year, season) slots — three events live across two seasons; dedup collapses to two. */
    const expectedSlotsWithRenderedEvents: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
    ]

    assert.deepStrictEqual(slotsWithRenderedEvents, expectedSlotsWithRenderedEvents)
  })

  describe('when the listing list is empty', () => {
    it('returns an empty slot list, writes nothing, and leaves every rendered_at null', () => {
      /** Distinct slots returned by the SUT. */
      const slotsWithRenderedEvents = renderEvents(db, [], outputDirPath, messageStream)

      assert.deepStrictEqual(slotsWithRenderedEvents, [])
      assert.strictEqual(messageStream.read(), null)

      /** `rendered_at` for every seeded row; should remain null since no event was rendered. */
      const renderedAtById = db.prepare('SELECT id, rendered_at FROM events ORDER BY id').all()
      assert.strictEqual(renderedAtById.length, 3)
      assert.strictEqual(renderedAtById[0]?.rendered_at, null)
      assert.strictEqual(renderedAtById[1]?.rendered_at, null)
      assert.strictEqual(renderedAtById[2]?.rendered_at, null)
    })
  })
})
