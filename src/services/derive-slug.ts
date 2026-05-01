import type ParsedEvent from '../types/parsed-event.js'
import isSlugConflicting from '../repositories/is-slug-conflicting.js'
import slugify from '../helpers/slugify.js'

/**
 * Derives a unique slug for the event. Idempotent for re-upserts at the same slot:
 * passing an unchanged title returns the existing slug rather than appending a suffix.
 *
 * @param event - Parsed event the slug is being derived for; its slot is excluded from the conflict check.
 * @returns Slug unique within the events table.
 */
const deriveSlug = async (event: ParsedEvent): Promise<string> => {
  /** Slugified title, used as the base for collision-resolved slugs. */
  const baseSlug = slugify(event.title)

  /** Current slug candidate; starts at the base and accrues `-N` suffixes on collision. */
  let slug = baseSlug

  /** Suffix counter for the next collision; first appended suffix is `-2`. */
  let counter = 2

  while (await isSlugConflicting(slug, event)) {
    slug = `${baseSlug}-${counter}`
    counter += 1
  }

  return slug
}

export default deriveSlug
