import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildYearIndexViewModel from '../../src/presenters/build-year-index-view-model.js'

describe('buildYearIndexViewModel', () => {
  it('projects every field — year label, four season cards (link / empty), and prev/next year links', () => {
    /** View model produced by the SUT for year 1066 with seasons 1 and 3 having events. */
    const viewModel = buildYearIndexViewModel(1066, [1, 3], 1065, 1067)

    assert.strictEqual(viewModel.yearLabel, '1066')
    assert.deepStrictEqual(viewModel.seasonCards, [
      { number: 0, label: 'Winter', indexPagePath: null },
      { number: 1, label: 'Spring', indexPagePath: '1066/1/index.html' },
      { number: 2, label: 'Summer', indexPagePath: null },
      { number: 3, label: 'Fall', indexPagePath: '1066/3/index.html' },
    ])
    assert.deepStrictEqual(viewModel.prevYearLink, {
      label: '1065',
      indexPagePath: '1065/index.html',
    })
    assert.deepStrictEqual(viewModel.nextYearLink, {
      label: '1067',
      indexPagePath: '1067/index.html',
    })
  })

  describe('when there is no previous year', () => {
    it('sets prevYearLink to null', () => {
      /** View model with `prevYear` null. */
      const viewModel = buildYearIndexViewModel(1066, [1], null, 1067)

      assert.strictEqual(viewModel.prevYearLink, null)
    })
  })

  describe('when there is no next year', () => {
    it('sets nextYearLink to null', () => {
      /** View model with `nextYear` null. */
      const viewModel = buildYearIndexViewModel(1066, [1], 1065, null)

      assert.strictEqual(viewModel.nextYearLink, null)
    })
  })
})
