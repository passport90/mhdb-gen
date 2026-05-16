import { describe, it } from 'node:test'
import type SeasonIndexPageViewModel from '../../src/types/season-index-page-view-model.js'
import assert from 'node:assert/strict'
import buildSeasonIndexPage from '../../src/presenters/build-season-index-page.js'

describe('buildSeasonIndexPage', () => {
  /** Base view model fixture; per-test overrides via spread. */
  const baseViewModel: SeasonIndexPageViewModel = {
    seasonLabel: 'Spring 1066',
    yearLabel: '1066',
    yearIndexPagePath: '1066/index.html',
    timelineEntries: [
      {
        dateRangeLabel: 'April 15–22, 1066',
        titleInlineHtml: 'First <em>Event</em>',
        eventPagePath: '1066/1-spring/1-first/index.html',
      },
      {
        dateRangeLabel: 'May 1, 1066',
        titleInlineHtml: 'Second Event',
        eventPagePath: '1066/1-spring/2-second/index.html',
      },
    ],
    prevSeasonLink: { label: 'Winter 1066', indexPagePath: '1066/0-winter/index.html' },
    nextSeasonLink: { label: 'Summer 1066', indexPagePath: '1066/2-summer/index.html' },
  }

  it('renders the full season index page with timeline list and prev+next season nav', () => {
    /** Expected HTML for the full happy-path season index page. */
    const expectedHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spring 1066 - MHDB</title>
    <base href="../../">
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
            <span class="current">Spring 1066</span>
          </nav>
        </div>
        <div class="breadcrumbs-meta"></div>
      </div>
    </div>
    <main>
      <h1>Spring 1066</h1>
      <ol class="season-timeline">
        <li>
          <span class="event-date">April 15–22, 1066</span>
          <a class="event-title" href="1066/1-spring/1-first/index.html">First <em>Event</em></a>
        </li>
        <li>
          <span class="event-date">May 1, 1066</span>
          <a class="event-title" href="1066/1-spring/2-second/index.html">Second Event</a>
        </li>
      </ol>
      <div class="season-nav" aria-label="Season navigation">
        <div class="season-nav-slot">
          <a class="season-nav-link" href="1066/0-winter/index.html">← Winter 1066</a>
        </div>
        <div class="season-nav-slot">
          <a class="season-nav-link" href="1066/2-summer/index.html">Summer 1066 →</a>
        </div>
      </div>
    </main>
  </body>
</html>
`

    /** Rendered HTML produced by the SUT. */
    const renderedHtml = buildSeasonIndexPage(baseViewModel)

    assert.strictEqual(renderedHtml, expectedHtml)
  })

  describe('when there is no previous season', () => {
    it('omits the previous-season link from the nav slot', () => {
      /** View model with `prevSeasonLink` cleared. */
      const viewModel: SeasonIndexPageViewModel = { ...baseViewModel, prevSeasonLink: null }

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildSeasonIndexPage(viewModel)

      assert.ok(!renderedHtml.includes('← Winter 1066'))
      assert.ok(renderedHtml.includes('Summer 1066 →'))
    })
  })

  describe('when there is no next season', () => {
    it('omits the next-season link from the nav slot', () => {
      /** View model with `nextSeasonLink` cleared. */
      const viewModel: SeasonIndexPageViewModel = { ...baseViewModel, nextSeasonLink: null }

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildSeasonIndexPage(viewModel)

      assert.ok(renderedHtml.includes('← Winter 1066'))
      assert.ok(!renderedHtml.includes('Summer 1066 →'))
    })
  })
})
