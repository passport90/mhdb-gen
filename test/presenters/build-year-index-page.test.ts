import { describe, it } from 'node:test'
import type YearIndexPageViewModel from '../../src/types/year-index-page-view-model.js'
import assert from 'node:assert/strict'
import buildYearIndexPage from '../../src/presenters/build-year-index-page.js'

describe('buildYearIndexPage', () => {
  /** Base view model fixture; per-test overrides via spread. */
  const baseViewModel: YearIndexPageViewModel = {
    yearLabel: '1066',
    seasonCards: [
      { number: 0, label: 'Winter', indexPagePath: null },
      { number: 1, label: 'Spring', indexPagePath: '1066/1/index.html' },
      { number: 2, label: 'Summer', indexPagePath: null },
      { number: 3, label: 'Fall', indexPagePath: '1066/3/index.html' },
    ],
    prevYearLink: { label: '1065', indexPagePath: '1065/index.html' },
    nextYearLink: { label: '1067', indexPagePath: '1067/index.html' },
  }

  it('renders the full year index page with season cards (link / empty) and prev+next year nav', () => {
    /** Expected HTML for the full happy-path year index page. */
    const expectedHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seasons 1066 - MHDB</title>
    <base href="../">
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
            <span class="current">1066</span>
          </nav>
        </div>
        <div class="breadcrumbs-meta"></div>
      </div>
    </div>
    <main>
      <h1>1066</h1>
      <div class="season-cards">
        <span class="season-card season-card-empty" data-season="0">
          <span class="season-card-label">Winter</span>
        </span>
        <a class="season-card" data-season="1" href="1066/1/index.html">
          <span class="season-card-label">Spring</span>
        </a>
        <span class="season-card season-card-empty" data-season="2">
          <span class="season-card-label">Summer</span>
        </span>
        <a class="season-card" data-season="3" href="1066/3/index.html">
          <span class="season-card-label">Fall</span>
        </a>
      </div>
      <div class="season-nav" aria-label="Year navigation">
        <div class="season-nav-slot">
          <a class="season-nav-link" href="1065/index.html">← 1065</a>
        </div>
        <div class="season-nav-slot">
          <a class="season-nav-link" href="1067/index.html">1067 →</a>
        </div>
      </div>
    </main>
  </body>
</html>
`

    /** Rendered HTML produced by the SUT. */
    const renderedHtml = buildYearIndexPage(baseViewModel)

    assert.strictEqual(renderedHtml, expectedHtml)
  })

  describe('when there is no previous year', () => {
    it('omits the previous-year link from the nav slot', () => {
      /** View model with `prevYearLink` cleared. */
      const viewModel: YearIndexPageViewModel = { ...baseViewModel, prevYearLink: null }

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildYearIndexPage(viewModel)

      assert.ok(!renderedHtml.includes('← 1065'))
      assert.ok(renderedHtml.includes('1067 →'))
    })
  })

  describe('when there is no next year', () => {
    it('omits the next-year link from the nav slot', () => {
      /** View model with `nextYearLink` cleared. */
      const viewModel: YearIndexPageViewModel = { ...baseViewModel, nextYearLink: null }

      /** Rendered HTML produced by the SUT. */
      const renderedHtml = buildYearIndexPage(viewModel)

      assert.ok(renderedHtml.includes('← 1065'))
      assert.ok(!renderedHtml.includes('1067 →'))
    })
  })
})
