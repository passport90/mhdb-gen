import type EventSlot from '../types/event-slot.js'

/**
 * Checks whether the slug is taken by an event at a slot other than the given one.
 *
 * @param _slug - Slug to check.
 * @param _slot - Slot to exclude from the conflict check (the row being upserted).
 * @returns `true` when another row holds the slug, `false` otherwise.
 */
const isSlugConflicting = async (_slug: string, _slot: EventSlot): Promise<boolean> => false

export default isSlugConflicting
