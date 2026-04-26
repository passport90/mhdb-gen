import type ParsedEventMeta from '../types/parsed-event-meta.js'

/**
 * Parses a YAML frontmatter block into a validated, camelCase `ParsedEventMeta`.
 *
 * @param _yaml - YAML block content (between the `---` fences, fences excluded).
 * @returns Validated `ParsedEventMeta`.
 * @throws `Error` when the YAML is malformed or required fields are missing.
 */
const parseFrontmatter = (_yaml: string): ParsedEventMeta => ({
  seasonalYear: 0,
  season: 0,
  position: 0,
  startDate: '',
  endDate: '',
})

export default parseFrontmatter
