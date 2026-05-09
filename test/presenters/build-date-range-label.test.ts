import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildDateRangeLabel from '../../src/presenters/build-date-range-label.js'

describe('buildDateRangeLabel', () => {
  it('formats a single-day range as `Month D, YYYY`', () => {
    /** Range collapsing to a single calendar day. */
    const label = buildDateRangeLabel('1066-10-14', '1066-10-14')

    assert.strictEqual(label, 'October 14, 1066')
  })

  describe('when the start and end dates span different days in the same month', () => {
    it('formats the range as `Month D–D, YYYY`', () => {
      /** Range within the same month. */
      const label = buildDateRangeLabel('2026-04-15', '2026-04-22')

      assert.strictEqual(label, 'April 15–22, 2026')
    })
  })

  describe('when the start and end dates span different months in the same year', () => {
    it('formats the range as `Month D – Month D, YYYY`', () => {
      /** Range spanning two months in one year. */
      const label = buildDateRangeLabel('2026-04-15', '2026-05-12')

      assert.strictEqual(label, 'April 15 – May 12, 2026')
    })
  })

  describe('when the start and end dates span different years', () => {
    it('formats the range as `Month D, YYYY – Month D, YYYY`', () => {
      /** Range crossing a year boundary. */
      const label = buildDateRangeLabel('2026-12-30', '2027-01-05')

      assert.strictEqual(label, 'December 30, 2026 – January 5, 2027')
    })
  })
})
