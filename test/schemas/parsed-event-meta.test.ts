import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parsedEventMetaSchema from '../../src/schemas/parsed-event-meta.js'

describe('parsedEventMetaSchema', () => {
  /** A sad-path input the schema must reject, paired with a label naming the rejection mode. */
  interface RejectionCase {
    /** Human-readable label naming the field and the rejection mode being tested. */
    name: string
    /** Input value the schema is expected to reject. */
    input: unknown
  }

  /** Complete, valid input that satisfies every field of the schema. */
  const validInput = {
    seasonalYear: 2026,
    season: 1,
    position: 3,
    startDate: '2026-04-15',
    endDate: '2026-04-22',
  }

  it('accepts a complete object with every field well-typed', () => {
    assert.deepStrictEqual(parsedEventMetaSchema.parse(validInput), validInput)
  })

  /** Sad-path inputs the schema must reject, one entry per (field, rejection-mode) pair. */
  const rejectionCases: RejectionCase[] = [
    { name: 'seasonalYear is missing', input: { ...validInput, seasonalYear: undefined } },
    { name: 'seasonalYear is not a number', input: { ...validInput, seasonalYear: '2026' } },
    { name: 'seasonalYear is a non-integer number', input: { ...validInput, seasonalYear: 2026.5 } },
    { name: 'season is missing', input: { ...validInput, season: undefined } },
    { name: 'season is not a number', input: { ...validInput, season: '1' } },
    { name: 'season is a non-integer number', input: { ...validInput, season: 1.5 } },
    { name: 'position is missing', input: { ...validInput, position: undefined } },
    { name: 'position is not a number', input: { ...validInput, position: '3' } },
    { name: 'position is a non-integer number', input: { ...validInput, position: 3.5 } },
    { name: 'startDate is missing', input: { ...validInput, startDate: undefined } },
    { name: 'startDate is not a string', input: { ...validInput, startDate: 20260415 } },
    { name: 'startDate is not an ISO 8601 date', input: { ...validInput, startDate: 'April 15, 2026' } },
    { name: 'endDate is missing', input: { ...validInput, endDate: undefined } },
    { name: 'endDate is not a string', input: { ...validInput, endDate: 20260422 } },
    { name: 'endDate is not an ISO 8601 date', input: { ...validInput, endDate: 'April 22, 2026' } },
  ]

  for (const { name, input } of rejectionCases) {
    describe(`when ${name}`, () => {
      it('rejects', () => {
        assert.throws(() => parsedEventMetaSchema.parse(input))
      })
    })
  }
})
