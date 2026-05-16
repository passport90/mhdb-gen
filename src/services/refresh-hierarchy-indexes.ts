import type { DatabaseSync } from 'node:sqlite'
import type EventListing from '../types/event-listing.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import renderRootIndex from './render-root-index.js'
import renderSeasonIndex from './render-season-index.js'
import renderYearIndex from './render-year-index.js'

/**
 * Re-renders the root, year, and season index pages whose subtrees were touched this run —
 * either by an event re-rendered or an orphan output pruned. Skipped entirely when no subtree
 * changed.
 *
 * @param db - Database handle; the caller controls the transaction lifecycle.
 * @param outputDirPath - Output root.
 * @param listings - Snapshot of every event listing, threaded into the season-index renderer
 *   as its data source so it doesn't re-query (or re-slugify) per slot.
 * @param slotsWithRenderedEvents - Slots containing at least one event re-rendered this run.
 * @param slotsWithPrunedEvents - Slots containing at least one event whose orphan output was pruned this run.
 */
const refreshHierarchyIndexes = (
  db: DatabaseSync,
  outputDirPath: string,
  listings: EventListing[],
  slotsWithRenderedEvents: SeasonalSlot[],
  slotsWithPrunedEvents: SeasonalSlot[],
): void => {
  if (slotsWithRenderedEvents.length === 0 && slotsWithPrunedEvents.length === 0) return

  renderRootIndex(db, outputDirPath)

  /** Distinct years across both inputs; year index refreshed once per. */
  const touchedYearSet = collectTouchedYearSet(slotsWithRenderedEvents, slotsWithPrunedEvents)
  for (const year of touchedYearSet) {
    renderYearIndex(db, outputDirPath, year)
  }

  /** Distinct (year, season) slots across both inputs; season index refreshed once per. */
  const touchedSlots = collectTouchedSlots(slotsWithRenderedEvents, slotsWithPrunedEvents)
  for (const slot of touchedSlots) {
    renderSeasonIndex(db, outputDirPath, slot, listings)
  }
}

/**
 * Collects the distinct slots across `slotsWithRenderedEvents` and `slotsWithPrunedEvents`,
 * deduping by `(year, season)`.
 *
 * @param slotsWithRenderedEvents - Slots containing at least one re-rendered event.
 * @param slotsWithPrunedEvents - Slots containing at least one event whose orphan output was pruned.
 * @returns Array of distinct slots, in encounter order (rendered first, then pruned).
 */
const collectTouchedSlots = (
  slotsWithRenderedEvents: SeasonalSlot[],
  slotsWithPrunedEvents: SeasonalSlot[],
): SeasonalSlot[] => {
  /** Distinct slots keyed by `year:season`; preserves first-encounter order via Map insertion order. */
  const slotByKeyMap = new Map<string, SeasonalSlot>()

  for (const slot of [...slotsWithRenderedEvents, ...slotsWithPrunedEvents]) {
    /** Composite key uniquely identifying `slot`. */
    const slotKey = `${slot.seasonalYear}:${slot.season}`
    if (!slotByKeyMap.has(slotKey)) slotByKeyMap.set(slotKey, slot)
  }

  return [...slotByKeyMap.values()]
}

/**
 * Collects the distinct years across `slotsWithRenderedEvents` and `slotsWithPrunedEvents`.
 *
 * @param slotsWithRenderedEvents - Slots containing at least one re-rendered event.
 * @param slotsWithPrunedEvents - Slots containing at least one event whose orphan output was pruned.
 * @returns Set of years touched by either input.
 */
const collectTouchedYearSet = (
  slotsWithRenderedEvents: SeasonalSlot[],
  slotsWithPrunedEvents: SeasonalSlot[],
): Set<number> => {
  /** Distinct years across both inputs. */
  const yearSet = new Set<number>()
  for (const slot of slotsWithRenderedEvents) yearSet.add(slot.seasonalYear)
  for (const slot of slotsWithPrunedEvents) yearSet.add(slot.seasonalYear)

  return yearSet
}

export default refreshHierarchyIndexes
