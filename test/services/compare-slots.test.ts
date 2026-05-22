import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import compareSlots from '../../src/services/compare-slots.js'

describe('compareSlots', () => {
  it('returns -1 when a\'s year is earlier than b\'s', () => {
    assert.strictEqual(
      compareSlots({ seasonalYear: 1066, season: 3 }, { seasonalYear: 2026, season: 0 }),
      -1,
    )
  })

  it('returns 1 when a\'s year is later than b\'s', () => {
    assert.strictEqual(
      compareSlots({ seasonalYear: 2026, season: 0 }, { seasonalYear: 1066, season: 3 }),
      1,
    )
  })

  it('returns -1 when years match and a\'s season is earlier than b\'s', () => {
    assert.strictEqual(
      compareSlots({ seasonalYear: 1066, season: 1 }, { seasonalYear: 1066, season: 3 }),
      -1,
    )
  })

  it('returns 1 when years match and a\'s season is later than b\'s', () => {
    assert.strictEqual(
      compareSlots({ seasonalYear: 1066, season: 3 }, { seasonalYear: 1066, season: 1 }),
      1,
    )
  })

  it('returns 0 when year and season both match', () => {
    assert.strictEqual(
      compareSlots({ seasonalYear: 1066, season: 2 }, { seasonalYear: 1066, season: 2 }),
      0,
    )
  })
})
