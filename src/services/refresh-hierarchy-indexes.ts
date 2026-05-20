import type EventListing from '../types/event-listing.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import compareSlots from '../helpers/compare-slots.js'
import renderRootIndex from './render-root-index.js'
import renderSeasonIndex from './render-season-index.js'
import renderYearIndex from './render-year-index.js'

/**
 * Re-renders the root, year, and season index pages whose subtrees were touched this run —
 * either by an event re-rendered or an orphan output pruned. Skipped entirely when no
 * subtree changed.
 *
 * Each touched slot also pulls in its closest occupied earlier and later neighbor slot,
 * because those neighbors' `prevSeasonLink` / `nextSeasonLink` may have been reaching
 * across the touched slot — adding the first event to a previously-empty slot, or pruning
 * the last event from a slot, changes the neighbor relationship even when the neighbors
 * themselves had no event activity this run.
 *
 * @param outputDirPath - Output root.
 * @param listings - Snapshot of every event listing, threaded into every index renderer as
 *   its data source so they don't re-query (or re-slugify) per call.
 * @param slotsWithRenderedEvents - Slots containing at least one event re-rendered this run.
 * @param slotsWithPrunedEvents - Slots containing at least one event whose orphan output was pruned this run.
 */
const refreshHierarchyIndexes = (
  outputDirPath: string,
  listings: EventListing[],
  slotsWithRenderedEvents: SeasonalSlot[],
  slotsWithPrunedEvents: SeasonalSlot[],
): void => {
  if (slotsWithRenderedEvents.length === 0 && slotsWithPrunedEvents.length === 0) return

  renderRootIndex(outputDirPath, listings)

  /** Distinct years across both inputs; year index refreshed once per. */
  const touchedYearSet = collectTouchedYearSet(slotsWithRenderedEvents, slotsWithPrunedEvents)
  for (const year of touchedYearSet) {
    renderYearIndex(outputDirPath, year, listings)
  }

  /** Distinct slots occupied in this run's listings, in `(year, season)` ascending order — neighbor-lookup index. */
  const occupiedSlots = collectOccupiedSlots(listings)

  /** Touched slots plus their closest occupied earlier and later neighbors; covers cross-slot prev/next link drift. */
  const touchedSlots = expandWithNeighborSlots(
    collectTouchedSlots(slotsWithRenderedEvents, slotsWithPrunedEvents),
    occupiedSlots,
  )
  for (const slot of touchedSlots) {
    renderSeasonIndex(outputDirPath, slot, listings)
  }
}

/**
 * Adds `slot` to `slotByKeyMap` under its `(year, season)` composite key. No-ops when
 * `slot` is `null` or the key is already present — call sites stay clean of duplicate dedup
 * boilerplate.
 *
 * @param slotByKeyMap - Map being accumulated; mutated in place.
 * @param slot - Slot to add, or `null` to skip.
 */
const addSlotToMap = (slotByKeyMap: Map<string, SeasonalSlot>, slot: SeasonalSlot | null): void => {
  if (slot === null) return

  /** Composite key uniquely identifying `slot`. */
  const slotKey = `${slot.seasonalYear}:${slot.season}`
  if (!slotByKeyMap.has(slotKey)) slotByKeyMap.set(slotKey, slot)
}

/**
 * Collects the distinct slots occupied in `listings`, in `(year, season)` ascending order.
 * Relies on `listings` being sorted by `(seasonal_year, season, position)` so a single
 * forward pass with last-slot dedup is enough.
 *
 * @param listings - Snapshot of every event listing, ordered as above.
 * @returns Distinct occupied slots, ascending.
 */
const collectOccupiedSlots = (listings: EventListing[]): SeasonalSlot[] => {
  /** Distinct occupied slots accumulated across the pass. */
  const occupiedSlots: SeasonalSlot[] = []

  /** Last slot pushed; tracks dedup state for the linear pass. */
  let lastSlot: SeasonalSlot | null = null

  for (const listing of listings) {
    if (
      lastSlot !== null
      && lastSlot.seasonalYear === listing.seasonalYear
      && lastSlot.season === listing.season
    ) continue

    lastSlot = { seasonalYear: listing.seasonalYear, season: listing.season }
    occupiedSlots.push(lastSlot)
  }

  return occupiedSlots
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
    addSlotToMap(slotByKeyMap, slot)
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

/**
 * Expands `touchedSlots` with each touched slot's closest occupied earlier and later
 * neighbor in `occupiedSlots`. Required to refresh neighbor season-index pages whose
 * `prevSeasonLink` / `nextSeasonLink` was reaching across a slot that became occupied (or
 * across a slot that was pruned to empty) this run.
 *
 * @param touchedSlots - Slots already known to need a season-index re-render.
 * @param occupiedSlots - Distinct occupied slots in `(year, season)` ascending order.
 * @returns Touched slots plus their closest occupied neighbors on either side, deduped by
 *   `(year, season)`.
 */
const expandWithNeighborSlots = (
  touchedSlots: SeasonalSlot[],
  occupiedSlots: SeasonalSlot[],
): SeasonalSlot[] => {
  /** Expanded slot set keyed by `year:season`; preserves first-encounter order via Map insertion order. */
  const slotByKeyMap = new Map<string, SeasonalSlot>()

  for (const slot of touchedSlots) {
    addSlotToMap(slotByKeyMap, slot)
    addSlotToMap(slotByKeyMap, findPrevOccupiedSlot(slot, occupiedSlots))
    addSlotToMap(slotByKeyMap, findNextOccupiedSlot(slot, occupiedSlots))
  }

  return [...slotByKeyMap.values()]
}

/**
 * Finds the closest occupied slot strictly later than `slot` in `occupiedSlots`.
 *
 * @param slot - Reference slot; may or may not itself appear in `occupiedSlots`.
 * @param occupiedSlots - Distinct occupied slots in `(year, season)` ascending order.
 * @returns First occupied slot strictly after `slot`, or `null` when none exists.
 */
const findNextOccupiedSlot = (slot: SeasonalSlot, occupiedSlots: SeasonalSlot[]): SeasonalSlot | null => {
  for (const occupiedSlot of occupiedSlots) {
    if (compareSlots(occupiedSlot, slot) > 0) return occupiedSlot
  }

  return null
}

/**
 * Finds the closest occupied slot strictly earlier than `slot` in `occupiedSlots`.
 *
 * @param slot - Reference slot; may or may not itself appear in `occupiedSlots`.
 * @param occupiedSlots - Distinct occupied slots in `(year, season)` ascending order.
 * @returns Last occupied slot strictly before `slot`, or `null` when none exists.
 */
const findPrevOccupiedSlot = (slot: SeasonalSlot, occupiedSlots: SeasonalSlot[]): SeasonalSlot | null => {
  /** Best candidate seen so far that precedes `slot`; updated as the cursor advances. */
  let prevOccupiedSlot: SeasonalSlot | null = null

  for (const occupiedSlot of occupiedSlots) {
    if (compareSlots(occupiedSlot, slot) >= 0) break
    prevOccupiedSlot = occupiedSlot
  }

  return prevOccupiedSlot
}

export default refreshHierarchyIndexes
