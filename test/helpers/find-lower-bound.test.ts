import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import compareNumbers from '../../src/helpers/compare-numbers.js'
import findLowerBound from '../../src/helpers/find-lower-bound.js'

describe('findLowerBound', () => {
  it('returns 0 for an empty array', () => {
    assert.strictEqual(findLowerBound([], 42, compareNumbers), 0)
  })

  it('returns 0 when the target precedes every element', () => {
    assert.strictEqual(findLowerBound([1066, 1500, 2026], 999, compareNumbers), 0)
  })

  it('returns array length when the target follows every element', () => {
    assert.strictEqual(findLowerBound([1066, 1500, 2026], 9999, compareNumbers), 3)
  })

  it('returns the index of the matching element when the target is present', () => {
    assert.strictEqual(findLowerBound([1066, 1500, 2026], 1500, compareNumbers), 1)
  })

  it('returns the index of the first element greater than the target when the target sits between elements', () => {
    assert.strictEqual(findLowerBound([1066, 1500, 2026], 1700, compareNumbers), 2)
  })
})
