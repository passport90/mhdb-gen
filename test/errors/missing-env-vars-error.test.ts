import { describe, it } from 'node:test'
import MissingEnvVarsError from '../../src/errors/missing-env-vars-error.js'
import assert from 'node:assert/strict'

describe('MissingEnvVarsError', () => {
  it('builds with the joined names in the message and the array stored', () => {
    /** Error under inspection. */
    const error = new MissingEnvVarsError(['FOO', 'BAR', 'BAZ'])

    assert.strictEqual(error.name, 'MissingEnvVarsError')
    assert.strictEqual(error.message, 'missing required environment variables: FOO, BAR, BAZ')
    assert.deepStrictEqual(error.missingEnvVarNames, ['FOO', 'BAR', 'BAZ'])
    assert.ok(error instanceof Error)
  })
})
