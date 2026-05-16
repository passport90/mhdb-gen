import { describe, it } from 'node:test'
import type EventToRender from '../../src/types/event-to-render.js'
import assert from 'node:assert/strict'
import buildEventViewModel from '../../src/presenters/build-event-view-model.js'

describe('buildEventViewModel', () => {
  /** Base event fixture; per-test overrides via spread. */
  const baseEvent: EventToRender = {
    id: 7,
    slug: 'battle-of-hastings',
    title: 'Battle of *Hastings*',
    description: 'A *decisive* victory.',
    illustrationHash: 'a1b2c3',
    startDate: '1066-10-14',
    endDate: '1066-10-14',
    seasonalYear: 1066,
    season: 3,
    position: 2,
    updatedAt: '2026-05-05 12:00:00',
  }

  /** Fixture for the previous in-season event; populates `prevLink` in the happy-path test. */
  const prevEventFixture: EventToRender = {
    id: 6,
    slug: 'norman-prologue',
    title: 'Norman *Prologue*',
    description: '',
    illustrationHash: null,
    startDate: '1066-09-28',
    endDate: '1066-09-28',
    seasonalYear: 1066,
    season: 3,
    position: 1,
    updatedAt: '2026-05-05 12:00:00',
  }

  /** Fixture for the next in-season event; populates `nextLink` in the happy-path test. */
  const nextEventFixture: EventToRender = {
    id: 8,
    slug: 'aftermath',
    title: 'Aftermath',
    description: '',
    illustrationHash: null,
    startDate: '1066-12-25',
    endDate: '1066-12-25',
    seasonalYear: 1066,
    season: 3,
    position: 3,
    updatedAt: '2026-05-05 12:00:00',
  }

  it('projects every field — title, label, paths, illustration, date range, description, links, timestamp', () => {
    /** View model produced by the SUT. */
    const viewModel = buildEventViewModel(baseEvent, prevEventFixture, nextEventFixture)

    assert.strictEqual(viewModel.title.inlineHtml, 'Battle of <em>Hastings</em>')
    assert.strictEqual(viewModel.title.plainText, 'Battle of Hastings')
    assert.strictEqual(viewModel.breadcrumb.year.label, '1066')
    assert.strictEqual(viewModel.breadcrumb.year.indexPagePath, '1066/index.html')
    assert.strictEqual(viewModel.breadcrumb.season.label, 'Fall 1066')
    assert.strictEqual(viewModel.breadcrumb.season.indexPagePath, '1066/3-fall/index.html')
    assert.strictEqual(viewModel.illustrationPath, '1066/3-fall/2-battle-of-hastings/illustration.png')
    assert.strictEqual(viewModel.dateRangeLabel, 'October 14, 1066')
    assert.strictEqual(viewModel.descriptionHtml, '<p>A <em>decisive</em> victory.</p>')
    assert.deepStrictEqual(viewModel.siblingNavigation.prevLink, {
      path: '1066/3-fall/1-norman-prologue/index.html',
      titleInlineHtml: 'Norman <em>Prologue</em>',
    })
    assert.deepStrictEqual(viewModel.siblingNavigation.nextLink, {
      path: '1066/3-fall/3-aftermath/index.html',
      titleInlineHtml: 'Aftermath',
    })
    assert.strictEqual(viewModel.updatedAtLabel, 'May 5, 2026 12:00:00')
  })

  describe('when the event has no illustration', () => {
    it('sets illustrationPath to null', () => {
      /** View model produced by the SUT. */
      const viewModel = buildEventViewModel({ ...baseEvent, illustrationHash: null }, null, null)

      assert.strictEqual(viewModel.illustrationPath, null)
    })
  })

  describe('when there is no previous event in the season', () => {
    it('sets siblingNavigation.prevLink to null', () => {
      /** View model produced by the SUT. */
      const viewModel = buildEventViewModel(baseEvent, null, nextEventFixture)

      assert.strictEqual(viewModel.siblingNavigation.prevLink, null)
    })
  })

  describe('when there is no next event in the season', () => {
    it('sets siblingNavigation.nextLink to null', () => {
      /** View model produced by the SUT. */
      const viewModel = buildEventViewModel(baseEvent, prevEventFixture, null)

      assert.strictEqual(viewModel.siblingNavigation.nextLink, null)
    })
  })
})
