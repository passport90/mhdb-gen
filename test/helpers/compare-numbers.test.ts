import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import compareNumbers from '../../src/helpers/compare-numbers.js'

describe('compareNumbers', () => {
  it('returns -1 when a is less than b', () => {
    assert.strictEqual(compareNumbers(1066, 2026), -1)
  })

  it('returns 1 when a is greater than b', () => {
    assert.strictEqual(compareNumbers(2026, 1066), 1)
  })

  it('returns 0 when a and b are equal', () => {
    assert.strictEqual(compareNumbers(1066, 1066), 0)
  })
})
