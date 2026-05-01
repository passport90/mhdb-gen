import { describe, it } from 'node:test'
import MissingEnvVarsError from '../../src/errors/missing-env-vars-error.js'
import assert from 'node:assert/strict'
import checkEnvVars from '../../src/helpers/check-env-vars.js'

describe('checkEnvVars', () => {
  it('returns when every required name is present in the env dict', () => {
    checkEnvVars({ FOO: 'a', BAR: 'b' }, ['FOO', 'BAR'])
  })

  describe('when one or more required names are missing', () => {
    it('throws a MissingEnvVarsError listing every missing name', () => {
      assert.throws(
        () => checkEnvVars({ FOO: 'a' }, ['FOO', 'BAR', 'BAZ']),
        (err: unknown) => {
          assert.ok(err instanceof MissingEnvVarsError)
          assert.deepStrictEqual(err.missingEnvVarNames, ['BAR', 'BAZ'])

          return true
        },
      )
    })
  })
})
