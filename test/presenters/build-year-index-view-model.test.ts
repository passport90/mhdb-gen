import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildYearIndexViewModel from '../../src/presenters/build-year-index-view-model.js'

describe('buildYearIndexViewModel', () => {
  it('projects every field — year label and four season cards (link / empty)', () => {
    /** View model produced by the SUT for year 1066 with seasons 1 and 3 having events. */
    const viewModel = buildYearIndexViewModel({
      year: 1066,
      seasonsInYear: [1, 3],
    })

    assert.strictEqual(viewModel.yearLabel, '1066')
    assert.deepStrictEqual(viewModel.seasonCards, [
      { number: 0, label: 'Winter', indexPagePath: null },
      { number: 1, label: 'Spring', indexPagePath: '1066/1-spring/index.html' },
      { number: 2, label: 'Summer', indexPagePath: null },
      { number: 3, label: 'Fall', indexPagePath: '1066/3-fall/index.html' },
    ])
  })
})
