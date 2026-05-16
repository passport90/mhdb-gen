import { describe, it } from 'node:test'
import type EventPageViewModel from '../../src/types/event-page-view-model.js'
import assert from 'node:assert/strict'
import buildEventPage from '../../src/presenters/build-event-page.js'

describe('buildEventPage', () => {
  /** Base view model fixture — every field populated; per-test overrides via spread. */
  const baseViewModel: EventPageViewModel = {
    title: {
      inlineHtml: 'Battle of <em>Hastings</em>',
      plainText: 'Battle of Hastings',
    },
    breadcrumb: {
      year: { label: '1066', indexPagePath: '1066/index.html' },
      season: { label: 'Fall 1066', indexPagePath: '1066/3-fall/index.html' },
    },
    dateRangeLabel: 'October 14, 1066',
    illustrationPath: '1066/3-fall/2-battle-of-hastings/illustration.png',
    descriptionHtml: '<p>A <em>decisive</em> victory.</p>',
    siblingNavigation: {
      prevLink: {
        path: '1066/3-fall/1-norman-prologue/index.html',
        titleInlineHtml: 'Norman Prologue',
      },
      nextLink: {
        path: '1066/3-fall/3-aftermath/index.html',
        titleInlineHtml: 'Aftermath',
      },
    },
    updatedAtLabel: 'May 5, 2026 12:00:00',
  }

  it('renders the full event page with every section populated', () => {
    /** Expected HTML for the full happy-path event page. */
    const expectedHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Battle of Hastings - MHDB</title>
    <base href="../../../">
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <header>
      <div class="header-inner">
        <a class="brand-mark" href="index.html" aria-label="MHDB home">MHDB</a>
      </div>
    </header>
    <div class="breadcrumbs-bar">
      <div class="breadcrumbs-inner">
        <div class="breadcrumbs-main">
          <nav aria-label="breadcrumb">
            <a href="index.html">Home</a>
            <a href="1066/index.html">1066</a>
            <a href="1066/3-fall/index.html">Fall 1066</a>
            <span class="current">Battle of <em>Hastings</em></span>
          </nav>
        </div>
        <div class="breadcrumbs-meta"></div>
      </div>
    </div>
    <main>
      <figure class="event-illustration">
        <img src="1066/3-fall/2-battle-of-hastings/illustration.png" alt="">
        <figcaption class="event-illustration-title">
          <h1 class="title-with-subtitle event-title">Battle of <em>Hastings</em></h1>
        </figcaption>
      </figure>
      <div class="detail-layout">
        <section class="detail-secondary" aria-label="Event details">
          <dl class="detail-meta">
            <div class="detail-meta-item">
              <dt>Season</dt>
              <dd><a href="1066/3-fall/index.html">Fall 1066</a></dd>
            </div>
            <div class="detail-meta-item">
              <dt>Date</dt>
              <dd>October 14, 1066</dd>
            </div>
          </dl>
        </section>
        <div class="main-content">
          <div class="description"><p>A <em>decisive</em> victory.</p></div>
        </div>
      </div>
      <div class="entry-nav" aria-label="Season entry navigation">
        <div class="entry-nav-slot">
          <a class="entry-nav-link" href="1066/3-fall/1-norman-prologue/index.html">← Norman Prologue</a>
        </div>
        <div class="entry-nav-slot">
          <a class="entry-nav-link" href="1066/3-fall/3-aftermath/index.html">Aftermath →</a>
        </div>
      </div>
      <div class="paper-stamp">
        <span class="stamp">Updated May 5, 2026 12:00:00 UTC</span>
      </div>
    </main>
  </body>
</html>
`

    /** Rendered HTML produced by the SUT. */
    const renderedHtml = buildEventPage(baseViewModel)

    assert.strictEqual(renderedHtml, expectedHtml)
  })

  describe('when the event has no illustration', () => {
    it('skips the figure block and renders the title h1 inside main-content', () => {
      /** View model with the illustration omitted. */
      const viewModel: EventPageViewModel = { ...baseViewModel, illustrationPath: null }

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildEventPage(viewModel)

      assert.ok(!renderedHtml.includes('<figure class="event-illustration">'))
      assert.match(renderedHtml, /<div class="main-content">\s*<h1 class="title-with-subtitle event-title">/)
    })
  })

  describe('when there is no previous event in the season', () => {
    it('renders a `Start of season` link to the season index in the prev slot', () => {
      /** View model with `prevLink` cleared. */
      const viewModel: EventPageViewModel = {
        ...baseViewModel,
        siblingNavigation: { ...baseViewModel.siblingNavigation, prevLink: null },
      }

      /** Expected anchor in the prev slot when there is no previous event. */
      const expectedAnchor = '<a class="entry-nav-link" href="1066/3-fall/index.html">Start of season</a>'

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildEventPage(viewModel)

      assert.ok(!renderedHtml.includes('← Norman Prologue'))
      assert.ok(renderedHtml.includes(expectedAnchor))
    })
  })

  describe('when there is no next event in the season', () => {
    it('renders an `End of season` link to the season index in the next slot', () => {
      /** View model with `nextLink` cleared. */
      const viewModel: EventPageViewModel = {
        ...baseViewModel,
        siblingNavigation: { ...baseViewModel.siblingNavigation, nextLink: null },
      }

      /** Expected anchor in the next slot when there is no next event. */
      const expectedAnchor = '<a class="entry-nav-link" href="1066/3-fall/index.html">End of season</a>'

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildEventPage(viewModel)

      assert.ok(!renderedHtml.includes('Aftermath →'))
      assert.ok(renderedHtml.includes(expectedAnchor))
    })
  })
})
