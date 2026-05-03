import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import type { DatabaseSync } from 'node:sqlite'
import type EventToRender from '../../src/types/event-to-render.js'
import { PassThrough } from 'node:stream'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'

describe('renderEvents', () => {
  /** Output root pinned for the test, threaded through to the mocked `renderEvent`. */
  const outputDir = '/tmp/mhdb-output-test-fixture'

  /** Hydrated event returned by the mocked `findEventById` when called with id 1. */
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

  /** Hydrated event returned by the mocked `findEventById` when called with id 2. */
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

  /** Hydrated event returned by the mocked `findEventById` when called with id 3. */
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

  /**
   * Sentinel db handle threaded through the mocked repos; the mocks never call any db
   * method, so the cast is safe.
   */
  const fakeDb = { __sentinel: 'db' } as unknown as DatabaseSync

  /** Mock for `findEventById`; routes by id to return the canned hydrated event. */
  let findEventByIdMock: ReturnType<typeof mock.fn>

  /** Mock for `renderEvent`. */
  let renderEventMock: ReturnType<typeof mock.fn>

  /** Mock for `markRendered`. */
  let markRenderedMock: ReturnType<typeof mock.fn>

  /** Message stream, reset per test. */
  let messageStream: PassThrough

  /** SUT, dynamically re-imported per test so the static imports resolve through the mocked loader. */
  let renderEvents: (
    db: DatabaseSync,
    ids: number[],
    outputDir: string,
    messageStream: PassThrough,
  ) => SeasonalSlot[]

  beforeEach(async () => {
    messageStream = new PassThrough()

    findEventByIdMock = mock.fn((_db: unknown, id: number) => {
      if (id === 1) return firstEvent
      if (id === 2) return firstEventSibling
      if (id === 3) return secondEvent
      throw new Error(`findEventByIdMock: unexpected id ${id}`)
    })
    renderEventMock = mock.fn()
    markRenderedMock = mock.fn()

    mock.module('../../src/repositories/find-event-by-id.js', { defaultExport: findEventByIdMock })
    mock.module('../../src/repositories/mark-rendered.js', { defaultExport: markRenderedMock })
    mock.module('../../src/services/render-event.js', { defaultExport: renderEventMock })

    renderEvents = (await import('../../src/services/render-events.js')).default
  })

  afterEach(() => {
    mock.restoreAll()
  })

  it('renders each event in id order, dedupes seasons across same-slot events, returns distinct slots', () => {
    /** Distinct seasons returned by the SUT. */
    const seasonsRendered = renderEvents(fakeDb, [1, 2, 3], outputDir, messageStream)

    assert.strictEqual(
      messageStream.read()?.toString(),
      '[1/3] first-event\n[2/3] first-event-sibling\n[3/3] second-event\n',
    )

    assert.strictEqual(findEventByIdMock.mock.callCount(), 3)
    assert.deepStrictEqual(findEventByIdMock.mock.calls[0].arguments, [fakeDb, 1])
    assert.deepStrictEqual(findEventByIdMock.mock.calls[1].arguments, [fakeDb, 2])
    assert.deepStrictEqual(findEventByIdMock.mock.calls[2].arguments, [fakeDb, 3])

    assert.strictEqual(renderEventMock.mock.callCount(), 3)
    assert.deepStrictEqual(renderEventMock.mock.calls[0].arguments, [firstEvent, outputDir])
    assert.deepStrictEqual(renderEventMock.mock.calls[1].arguments, [firstEventSibling, outputDir])
    assert.deepStrictEqual(renderEventMock.mock.calls[2].arguments, [secondEvent, outputDir])

    assert.strictEqual(markRenderedMock.mock.callCount(), 3)
    assert.deepStrictEqual(markRenderedMock.mock.calls[0].arguments, [fakeDb, 1])
    assert.deepStrictEqual(markRenderedMock.mock.calls[1].arguments, [fakeDb, 2])
    assert.deepStrictEqual(markRenderedMock.mock.calls[2].arguments, [fakeDb, 3])

    /** Distinct (year, season) slots — three events live across two seasons; dedup collapses to two. */
    const expectedSeasonsRendered: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
    ]

    assert.deepStrictEqual(seasonsRendered, expectedSeasonsRendered)
  })
})
