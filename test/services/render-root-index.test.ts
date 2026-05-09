import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('renderRootIndex', () => {
  /** Sentinel returned by the mocked repo, traced into the view-model builder's call args. */
  const sentinelYears = [1066, 2026]

  /** Sentinel returned by the mocked view-model builder, traced into the page builder's call args. */
  const sentinelViewModel = { tag: 'sentinel-view-model' }

  /** Sentinel HTML returned by the mocked page builder, expected on disk. */
  const sentinelHtml = '<html>sentinel-root-index</html>'

  /** Mock for `findYearsWithEvents`; the leaf is hollow during the orchestrator's descent. */
  const findYearsWithEventsMock = mock.fn(() => sentinelYears)

  /** Mock for `buildRootIndexViewModel`; hollow during descent. */
  const buildRootIndexViewModelMock = mock.fn((): unknown => sentinelViewModel)

  /** Mock for `buildRootIndexPage`; hollow during descent. */
  const buildRootIndexPageMock = mock.fn(() => sentinelHtml)

  /** Sentinel database handle threaded into the SUT. */
  let db: DatabaseSync

  /** Tmp directory holding the output tree. */
  let tmpDirPath: string

  /** Output root threaded into the SUT. */
  let outputDirPath: string

  /** SUT, dynamically imported once after the module mocks are registered. */
  let renderRootIndex: (db: DatabaseSync, outputDirPath: string) => void

  before(async () => {
    mock.module(
      '../../src/repositories/find-years-with-events.js',
      { defaultExport: findYearsWithEventsMock },
    )
    mock.module(
      '../../src/presenters/build-root-index-view-model.js',
      { defaultExport: buildRootIndexViewModelMock },
    )
    mock.module(
      '../../src/presenters/build-root-index-page.js',
      { defaultExport: buildRootIndexPageMock },
    )

    renderRootIndex = (await import('../../src/services/render-root-index.js')).default
  })

  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    tmpDirPath = mkdtempSync(join(tmpdir(), 'mhdb-test-'))
    outputDirPath = join(tmpDirPath, 'output')

    findYearsWithEventsMock.mock.resetCalls()
    buildRootIndexViewModelMock.mock.resetCalls()
    buildRootIndexPageMock.mock.resetCalls()
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDirPath, { recursive: true, force: true })
  })

  it('chains the repo, view-model builder, and page builder, writing the page to <outputDirPath>/index.html', () => {
    renderRootIndex(db, outputDirPath)

    assert.deepStrictEqual(findYearsWithEventsMock.mock.calls[0]?.arguments, [db])
    assert.deepStrictEqual(buildRootIndexViewModelMock.mock.calls[0]?.arguments, [sentinelYears])
    assert.deepStrictEqual(buildRootIndexPageMock.mock.calls[0]?.arguments, [sentinelViewModel])
    assert.strictEqual(
      readFileSync(join(outputDirPath, 'index.html'), 'utf8'),
      sentinelHtml,
    )
  })
})
