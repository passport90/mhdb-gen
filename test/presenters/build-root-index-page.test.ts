import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildRootIndexPage from '../../src/presenters/build-root-index-page.js'

describe('buildRootIndexPage', () => {
  it('renders the decade matrix table with one link cell among empty cells', () => {
    /** Single 2020s decade row with a year link at column 6 (year 2026); the rest empty. */
    const decadeRows = [
      {
        decadeLabel: '2020s',
        yearLinks: [
          null,
          null,
          null,
          null,
          null,
          null,
          { label: '2026', indexPagePath: '2026/index.html' },
          null,
          null,
          null,
        ],
      },
    ]

    /** Expected HTML for the full happy-path root index page. */
    const expectedHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MHDB</title>
    <base href="./">
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
            <span class="current">Home</span>
          </nav>
        </div>
        <div class="breadcrumbs-meta"></div>
      </div>
    </div>
    <main>
      <h1>MHDB</h1>
      <table class="decade-index">
        <caption>Historical events by year</caption>
        <thead>
          <tr>
            <th></th>
            <th>0</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
            <th>6</th>
            <th>7</th>
            <th>8</th>
            <th>9</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">2020s</th>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
            <td><a href="2026/index.html">2026</a></td>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
            <td><span class="decade-empty">·</span></td>
          </tr>
        </tbody>
      </table>
    </main>
  </body>
</html>
`

    /** Rendered HTML produced by the SUT. */
    const renderedHtml = buildRootIndexPage(decadeRows)

    assert.strictEqual(renderedHtml, expectedHtml)
  })

  describe('when there are no decade rows', () => {
    it('renders an empty-state message in place of the matrix', () => {
      /** Rendered HTML produced by the SUT for an empty input. */
      const renderedHtml = buildRootIndexPage([])

      assert.ok(!renderedHtml.includes('<table class="decade-index">'))
      assert.ok(renderedHtml.includes('<p>No events with seasonal placement yet.</p>'))
    })
  })
})
