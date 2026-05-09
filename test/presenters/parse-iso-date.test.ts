import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parseIsoDate from '../../src/presenters/parse-iso-date.js'

describe('parseIsoDate', () => {
  it('splits a YYYY-MM-DD string into year, zero-indexed month, and day-of-month', () => {
    /** Calendar date for `1066-10-14` — a historical year, the kind our parser exists to handle. */
    const parsedDate = parseIsoDate('1066-10-14')

    assert.strictEqual(parsedDate.year, 1066)
    assert.strictEqual(parsedDate.monthIndex, 9)
    assert.strictEqual(parsedDate.dayOfMonth, 14)
  })
})
