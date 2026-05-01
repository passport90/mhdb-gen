import type ParsedEvent from '../types/parsed-event.js'
import parseEventMeta from './parse-event-meta.js'

/** Result of splitting an event file's raw content into metadata and body. */
interface FileSplit {
  /** Metadata block content (between the opening and closing `---` fences, fences excluded). */
  meta: string
  /** Body content (everything after the closing fence). */
  body: string
}

/** Result of splitting a markdown body at its H1 line. */
interface BodySplit {
  /** Event title, lifted from the H1 line. */
  title: string
  /** Body content after the H1 line, verbatim markdown. */
  description: string
}

/**
 * Parses the raw content of an event markdown file into a `ParsedEvent`.
 *
 * The file format is markdown with frontmatter: a `---`-fenced metadata block
 * followed by a markdown body whose H1 is the event title. The metadata block
 * must contain a JSON object — the JSON subset of YAML, not full YAML block
 * style.
 *
 * @param content - Raw file content.
 * @returns Event data composed from frontmatter and body.
 * @throws `Error` when frontmatter is missing or unterminated, or the body has no H1.
 */
const parseEventFileContent = (content: string): ParsedEvent => {
  /** Metadata block content and body, split out of the raw file content. */
  const fileSplit = splitFile(content)

  /** Parsed event metadata. */
  const eventMeta = parseEventMeta(fileSplit.meta)

  /** Title (from the H1) and description (everything after) of the body. */
  const bodySplit = splitBody(fileSplit.body)

  return {
    ...eventMeta,
    ...bodySplit,
  }
}

/**
 * Splits the raw file content at the `---` frontmatter fences.
 *
 * @param content - Raw file content.
 * @returns Metadata block content and body strings.
 * @throws `Error` when the frontmatter is missing or unterminated.
 */
const splitFile = (content: string): FileSplit => {
  if (!content.startsWith('---\n')) {
    throw new Error('missing frontmatter')
  }

  /** Index of the closing `---` fence's leading newline. */
  const closeIndex = content.indexOf('\n---\n', 4)
  if (closeIndex === -1) {
    throw new Error('unterminated frontmatter')
  }

  return {
    meta: content.slice(4, closeIndex),
    body: content.slice(closeIndex + 5),
  }
}

/**
 * Splits a markdown body at the first H1 line, lifting the title and leaving the rest as description.
 *
 * @param body - Markdown body content.
 * @returns Title and description.
 * @throws `Error` when no H1 line exists in the body.
 */
const splitBody = (body: string): BodySplit => {
  /** Body split into lines for H1 detection. */
  const bodyLines = body.split('\n')

  /** Index of the first H1 line in the body. */
  const h1Index = bodyLines.findIndex(line => line.startsWith('# '))

  if (h1Index === -1) {
    throw new Error('missing H1 title')
  }

  return {
    title: bodyLines[h1Index].slice(2).trim(),
    description: bodyLines.slice(h1Index + 1).join('\n'),
  }
}

export default parseEventFileContent
