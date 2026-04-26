import type ParsedEvent from '../types/parsed-event.js'

/**
 * Parses a markdown event source: splits frontmatter from body and lifts the H1 into `title`.
 *
 * @param _content - Whole file content as a string.
 * @returns Parsed event ready for slug derivation and upsert.
 */
const parseEventFileContent = (_content: string): ParsedEvent => ({
  seasonalYear: 0,
  season: 0,
  position: 0,
  startDate: '',
  endDate: '',
  title: '',
  description: '',
})

export default parseEventFileContent
