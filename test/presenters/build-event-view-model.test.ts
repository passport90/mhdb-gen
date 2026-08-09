import { describe, it } from 'node:test'
import type EventToRender from '../../src/types/event-to-render.js'
import assert from 'node:assert/strict'
import buildEventViewModel from '../../src/presenters/build-event-view-model.js'

describe('buildEventViewModel', () => {
  /** Base event fixture; per-test overrides via spread. */
  const baseEvent: EventToRender = {
    id: 7,
    title: 'Battle of *Hastings*',
    slug: 'battle-of-hastings',
    description: 'A *decisive* victory.',
    illustrationHash: 'a1b2c3',
    startDate: '1066-10-14',
    endDate: '1066-10-14',
    seasonalYear: 1066,
    season: 3,
    position: 2,
    updatedAt: '2026-05-05 12:00:00',
  }

  it('projects every field — title, label, paths, illustration, date range, description, timestamp', () => {
    /** View model produced by the SUT. */
    const viewModel = buildEventViewModel(baseEvent)

    assert.strictEqual(viewModel.title.inlineHtml, 'Battle of <em>Hastings</em>')
    assert.strictEqual(viewModel.title.plainText, 'Battle of Hastings')
    assert.strictEqual(viewModel.breadcrumb.year.label, '1066')
    assert.strictEqual(viewModel.breadcrumb.year.indexPagePath, '1066/index.html')
    assert.strictEqual(viewModel.breadcrumb.season.label, 'Fall 1066')
    assert.strictEqual(viewModel.breadcrumb.season.indexPagePath, '1066/3-fall/index.html')
    assert.strictEqual(viewModel.illustrationPath, '1066/3-fall/2-battle-of-hastings/illustration.png')
    assert.strictEqual(viewModel.dateRangeLabel, 'October 14, 1066')
    assert.strictEqual(viewModel.descriptionHtml, '<p>A <em>decisive</em> victory.</p>')
    assert.strictEqual(viewModel.updatedAtLabel, 'May 5, 2026 12:00:00')
  })

  describe('when the event has no illustration', () => {
    it('sets illustrationPath to null', () => {
      /** View model produced by the SUT. */
      const viewModel = buildEventViewModel({ ...baseEvent, illustrationHash: null })

      assert.strictEqual(viewModel.illustrationPath, null)
    })
  })
})
