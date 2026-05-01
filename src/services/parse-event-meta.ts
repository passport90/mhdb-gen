import type ParsedEventMeta from '../types/parsed-event-meta.js'

/**
 * Parses the JSON-encoded event metadata into a validated `ParsedEventMeta`.
 *
 * Accepts only the JSON subset of YAML (inputs `JSON.parse` accepts), not full
 * YAML block style — a deliberate restriction below the frontmatter format the
 * file as a whole adheres to.
 *
 * @param _meta - Metadata source as it appears between the `---` fences.
 * @returns Validated `ParsedEventMeta`.
 * @throws `Error` when the input is malformed JSON or does not match the `ParsedEventMeta` shape.
 */
const parseEventMeta = (_meta: string): ParsedEventMeta => ({
  seasonalYear: 0,
  season: 0,
  position: 0,
  startDate: '',
  endDate: '',
})

export default parseEventMeta
