/**
 * Slugifies the title — NFKD-normalizes, strips non-ASCII, lowercases, removes
 * non-word punctuation, collapses runs of whitespace and hyphens to a single
 * hyphen, trims leading and trailing hyphens and underscores.
 *
 * @param title - Event title.
 * @returns Slugified title.
 */
const slugify = (title: string): string => {
  /** Title with composed characters decomposed into base letters plus combining marks. */
  const decomposedTitle = title.normalize('NFKD')

  /** ASCII-only form of the title; characters with codepoint `>= 0x80` are dropped. */
  const asciiTitle = [...decomposedTitle].filter(char => char.charCodeAt(0) < 0x80).join('')

  /** Lowercased ASCII title. */
  const lowercasedTitle = asciiTitle.toLowerCase()

  /** Title with all characters outside word, whitespace, and hyphen removed. */
  const strippedTitle = lowercasedTitle.replace(/[^\w\s-]/g, '')

  /** Title with runs of whitespace and hyphens collapsed to a single hyphen. */
  const collapsedTitle = strippedTitle.replace(/[-\s]+/g, '-')

  return collapsedTitle.replace(/^[-_]+|[-_]+$/g, '')
}

export default slugify
