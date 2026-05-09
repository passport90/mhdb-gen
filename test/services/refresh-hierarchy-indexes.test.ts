import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import type SeasonalSlot from '../../src/types/seasonal-slot.js'
import assert from 'node:assert/strict'

describe('refreshHierarchyIndexes', () => {
  /** Mock for `renderRootIndex`; the leaf is hollow during the orchestrator's descent. */
  const renderRootIndexMock = mock.fn()

  /** Mock for `renderYearIndex`; hollow during descent. */
  const renderYearIndexMock = mock.fn()

  /** Mock for `renderSeasonIndex`; hollow during descent. */
  const renderSeasonIndexMock = mock.fn()

  /** Sentinel database handle threaded into the SUT and asserted as passed through. */
  let db: DatabaseSync

  /** Sentinel output root threaded into the SUT and asserted as passed through. */
  const outputDirPath = '/tmp/test-output'

  /** SUT, dynamically imported once after the module mocks are registered. */
  let refreshHierarchyIndexes: (
    db: DatabaseSync,
    outputDirPath: string,
    seasonsRendered: SeasonalSlot[],
    seasonsPruned: SeasonalSlot[],
  ) => void

  before(async () => {
    mock.module('../../src/services/render-root-index.js', { defaultExport: renderRootIndexMock })
    mock.module('../../src/services/render-year-index.js', { defaultExport: renderYearIndexMock })
    mock.module('../../src/services/render-season-index.js', { defaultExport: renderSeasonIndexMock })

    refreshHierarchyIndexes = (await import('../../src/services/refresh-hierarchy-indexes.js')).default
  })

  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    renderRootIndexMock.mock.resetCalls()
    renderYearIndexMock.mock.resetCalls()
    renderSeasonIndexMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
  })

  it('refreshes root, every touched year, and every touched slot, deduping years across slots', () => {
    /** Seasons with newly-rendered events, spanning two years (2026 and 1066). */
    const seasonsRendered: SeasonalSlot[] = [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
      { seasonalYear: 1066, season: 3 },
    ]

    /** No pruned seasons in this scenario. */
    const seasonsPruned: SeasonalSlot[] = []

    refreshHierarchyIndexes(db, outputDirPath, seasonsRendered, seasonsPruned)

    assert.strictEqual(renderRootIndexMock.mock.callCount(), 1)
    assert.deepStrictEqual(renderRootIndexMock.mock.calls[0]?.arguments, [db, outputDirPath])

    /** Years passed to `renderYearIndex`, in order. */
    const yearsRefreshed = renderYearIndexMock.mock.calls.map((c) => c.arguments[2])
    assert.deepStrictEqual(yearsRefreshed, [2026, 1066])

    /** Slots passed to `renderSeasonIndex`, in order. */
    const slotsRefreshed = renderSeasonIndexMock.mock.calls.map((c) => c.arguments[2])
    assert.deepStrictEqual(slotsRefreshed, [
      { seasonalYear: 2026, season: 1 },
      { seasonalYear: 2026, season: 2 },
      { seasonalYear: 1066, season: 3 },
    ])
  })

  describe('when the same slot appears in both rendered and pruned', () => {
    it('refreshes that slot once', () => {
      /** Single slot with new content. */
      const seasonsRendered: SeasonalSlot[] = [{ seasonalYear: 2026, season: 1 }]

      /** Same slot also flagged as having pruned orphan content. */
      const seasonsPruned: SeasonalSlot[] = [{ seasonalYear: 2026, season: 1 }]

      refreshHierarchyIndexes(db, outputDirPath, seasonsRendered, seasonsPruned)

      assert.strictEqual(renderYearIndexMock.mock.callCount(), 1)
      assert.strictEqual(renderSeasonIndexMock.mock.callCount(), 1)
      assert.deepStrictEqual(
        renderSeasonIndexMock.mock.calls[0]?.arguments[2],
        { seasonalYear: 2026, season: 1 },
      )
    })
  })

  describe('when no seasons were rendered or pruned', () => {
    it('skips every child renderer', () => {
      refreshHierarchyIndexes(db, outputDirPath, [], [])

      assert.strictEqual(renderRootIndexMock.mock.callCount(), 0)
      assert.strictEqual(renderYearIndexMock.mock.callCount(), 0)
      assert.strictEqual(renderSeasonIndexMock.mock.callCount(), 0)
    })
  })
})
