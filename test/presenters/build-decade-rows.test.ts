import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import buildDecadeRows from '../../src/presenters/build-decade-rows.js'

describe('buildDecadeRows', () => {
  it('groups years into decade rows, filling missing years with null cells', () => {
    /** Decade rows for three events spanning two decades. */
    const decadeRows = buildDecadeRows([1066, 2026, 2029])

    assert.strictEqual(decadeRows.length, 2)

    /** First decade row, covering 1060–1069. */
    const decade1060s = decadeRows[0]
    assert.strictEqual(decade1060s?.decadeLabel, '1060s')
    assert.strictEqual(decade1060s?.yearLinks.length, 10)
    assert.strictEqual(decade1060s?.yearLinks[0], null)
    assert.strictEqual(decade1060s?.yearLinks[5], null)
    assert.deepStrictEqual(decade1060s?.yearLinks[6], {
      label: '1066',
      indexPagePath: '1066/index.html',
    })
    assert.strictEqual(decade1060s?.yearLinks[7], null)

    /** Second decade row, covering 2020–2029. */
    const decade2020s = decadeRows[1]
    assert.strictEqual(decade2020s?.decadeLabel, '2020s')
    assert.deepStrictEqual(decade2020s?.yearLinks[6], {
      label: '2026',
      indexPagePath: '2026/index.html',
    })
    assert.strictEqual(decade2020s?.yearLinks[7], null)
    assert.strictEqual(decade2020s?.yearLinks[8], null)
    assert.deepStrictEqual(decade2020s?.yearLinks[9], {
      label: '2029',
      indexPagePath: '2029/index.html',
    })
  })

})
