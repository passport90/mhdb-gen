import type EventListing from '../types/event-listing.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import compareListingToYear from './compare-listing-to-year.js'
import compareSlots from './compare-slots.js'
import findLowerBound from '../helpers/find-lower-bound.js'
import renderRootIndex from './render-root-index.js'
import renderSeasonIndex from './render-season-index.js'
import renderYearIndex from './render-year-index.js'

/**
 * Re-renders the root, year, and season index pages whose subtrees were touched this run —
 * either by an event re-rendered or an orphan output pruned. Skipped entirely when no
 * subtree changed.
 *
 * Each touched year and slot also pulls in its closest occupied earlier and later
 * neighbor, because those neighbors' `prevYearLink` / `nextYearLink` and
 * `prevSeasonLink` / `nextSeasonLink` may have been reaching across the touched
 * year/slot — adding the first event to a previously-empty year or slot, or pruning the
 * last event from a year or slot, changes the neighbor relationship even when the
 * neighbors themselves had no event activity this run.
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

  /** Years directly touched by event activity this run, before neighbor expansion. */
  const touchedYearSet = collectTouchedYearSet(slotsWithRenderedEvents, slotsWithPrunedEvents)

  /** Touched years plus their closest occupied earlier and later neighbors; covers cross-year prev/next link drift. */
  const yearSetToRefresh = expandWithNeighborYears(touchedYearSet, listings)
  for (const year of yearSetToRefresh) {
    renderYearIndex(outputDirPath, year, listings)
  }

  /** Slots directly touched by event activity this run, before neighbor expansion. */
  const touchedSlots = collectTouchedSlots(slotsWithRenderedEvents, slotsWithPrunedEvents)

  /** Touched slots plus their closest occupied earlier and later neighbors; covers cross-slot prev/next link drift. */
  const slotsToRefresh = expandWithNeighborSlots(touchedSlots, listings)
  for (const slot of slotsToRefresh) {
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
 * neighbor as it appears in `listings`. Required to refresh neighbor season-index pages
 * whose `prevSeasonLink` / `nextSeasonLink` was reaching across a slot that became occupied
 * (or across a slot that was pruned to empty) this run. One binary search per touched slot;
 * the search index is threaded into both `findPrev/NextOccupiedSlot` so we don't pay it
 * twice.
 *
 * @param touchedSlots - Slots already known to need a season-index re-render.
 * @param listings - Snapshot of every event listing, sorted by `(seasonal_year, season, position)`.
 * @returns Touched slots plus their closest occupied neighbors on either side, deduped by
 *   `(year, season)`.
 */
const expandWithNeighborSlots = (
  touchedSlots: SeasonalSlot[],
  listings: EventListing[],
): SeasonalSlot[] => {
  /** Expanded slot set keyed by `year:season`; preserves first-encounter order via Map insertion order. */
  const slotByKeyMap = new Map<string, SeasonalSlot>()

  for (const slot of touchedSlots) {
    addSlotToMap(slotByKeyMap, slot)

    /** Lower-bound index of `slot` in `listings`; shared by the prev and next lookups below. */
    const lowerBoundIndex = findLowerBound(listings, slot, compareSlots)

    addSlotToMap(slotByKeyMap, findPrevOccupiedSlot(lowerBoundIndex, listings))
    addSlotToMap(slotByKeyMap, findNextOccupiedSlot(lowerBoundIndex, slot, listings))
  }

  return [...slotByKeyMap.values()]
}

/**
 * Expands `touchedYearSet` with each touched year's closest occupied earlier and later
 * neighbor as it appears in `listings`. Required to refresh neighbor year-index pages whose
 * `prevYearLink` / `nextYearLink` was reaching across a year that became occupied (or
 * across a year that was pruned to empty) this run. One binary search per touched year;
 * the search index is threaded into both `findPrev/NextOccupiedYear` so we don't pay it
 * twice.
 *
 * @param touchedYearSet - Years already known to need a year-index re-render.
 * @param listings - Snapshot of every event listing, sorted by `(seasonal_year, season, position)`.
 * @returns Touched years plus their closest occupied neighbors on either side.
 */
const expandWithNeighborYears = (
  touchedYearSet: Set<number>,
  listings: EventListing[],
): Set<number> => {
  /** Expanded year set seeded with the inputs; mutated by the loop. */
  const expandedYearSet = new Set<number>(touchedYearSet)

  for (const year of touchedYearSet) {
    /** Lower-bound index of `year` in `listings`; shared by the prev and next lookups below. */
    const lowerBoundIndex = findLowerBound(listings, year, compareListingToYear)

    /** Closest occupied year strictly earlier than `year`, or `null` when none exists. */
    const prevOccupiedYear = findPrevOccupiedYear(lowerBoundIndex, listings)
    if (prevOccupiedYear !== null) expandedYearSet.add(prevOccupiedYear)

    /** Closest occupied year strictly later than `year`, or `null` when none exists. */
    const nextOccupiedYear = findNextOccupiedYear(lowerBoundIndex, year, listings)
    if (nextOccupiedYear !== null) expandedYearSet.add(nextOccupiedYear)
  }

  return expandedYearSet
}

/**
 * Reads the closest occupied slot strictly later than the slot located at `lowerBoundIndex`
 * in `listings`. Walks past any listings still in the searched slot, then returns the slot
 * of the next listing. O(k) where k is the number of listings in the searched slot (zero
 * when empty, otherwise a handful in practice).
 *
 * @param lowerBoundIndex - Result of `findLowerBound(listings, slot, compareSlots)`.
 * @param slot - The slot that was searched for; needed to recognise same-slot listings to
 *   walk past.
 * @param listings - Snapshot of every event listing, sorted by `(seasonal_year, season, position)`.
 * @returns First occupied slot strictly after `slot`, or `null` when none exists.
 */
const findNextOccupiedSlot = (
  lowerBoundIndex: number,
  slot: SeasonalSlot,
  listings: EventListing[],
): SeasonalSlot | null => {
  /** Cursor walked past any listings in `slot` itself to land on the first listing strictly after. */
  let nextIndex = lowerBoundIndex
  while (
    nextIndex < listings.length
    && listings[nextIndex].seasonalYear === slot.seasonalYear
    && listings[nextIndex].season === slot.season
  ) {
    nextIndex++
  }

  if (nextIndex === listings.length) return null

  /** Listing in the next occupied slot; its `(year, season)` defines the neighbor. */
  const nextListing = listings[nextIndex]

  return { seasonalYear: nextListing.seasonalYear, season: nextListing.season }
}

/**
 * Reads the closest occupied year strictly later than the year located at `lowerBoundIndex`
 * in `listings`. Walks past any listings still in the searched year, then returns the year
 * of the next listing. O(k) where k is the number of listings in the searched year (zero
 * when empty, otherwise a handful in practice).
 *
 * @param lowerBoundIndex - Result of `findLowerBound(listings, year, compareListingToYear)`.
 * @param year - The year that was searched for; needed to recognise same-year listings to
 *   walk past.
 * @param listings - Snapshot of every event listing, sorted by `(seasonal_year, season, position)`.
 * @returns First occupied year strictly after `year`, or `null` when none exists.
 */
const findNextOccupiedYear = (
  lowerBoundIndex: number,
  year: number,
  listings: EventListing[],
): number | null => {
  /** Cursor walked past any listings in `year` itself to land on the first listing strictly after. */
  let nextIndex = lowerBoundIndex
  while (nextIndex < listings.length && listings[nextIndex].seasonalYear === year) {
    nextIndex++
  }

  return nextIndex < listings.length ? listings[nextIndex].seasonalYear : null
}

/**
 * Reads the closest occupied slot strictly earlier than the slot located at
 * `lowerBoundIndex` in `listings`. Constant-time — the listing immediately before
 * `lowerBoundIndex` (when any) is guaranteed to be in a strictly-earlier slot.
 *
 * @param lowerBoundIndex - Result of `findLowerBound(listings, slot, compareSlots)`.
 * @param listings - Snapshot of every event listing, sorted by `(seasonal_year, season, position)`.
 * @returns Last occupied slot strictly before the searched slot, or `null` when none exists.
 */
const findPrevOccupiedSlot = (lowerBoundIndex: number, listings: EventListing[]): SeasonalSlot | null => {
  if (lowerBoundIndex === 0) return null

  /** Listing immediately before the lower-bound index; its slot is the predecessor. */
  const prevListing = listings[lowerBoundIndex - 1]

  return { seasonalYear: prevListing.seasonalYear, season: prevListing.season }
}

/**
 * Reads the closest occupied year strictly earlier than the year located at
 * `lowerBoundIndex` in `listings`. Constant-time — the listing immediately before
 * `lowerBoundIndex` (when any) is guaranteed to be in a strictly-earlier year.
 *
 * @param lowerBoundIndex - Result of `findLowerBound(listings, year, compareListingToYear)`.
 * @param listings - Snapshot of every event listing, sorted by `(seasonal_year, season, position)`.
 * @returns Last occupied year strictly before the searched year, or `null` when none exists.
 */
const findPrevOccupiedYear = (lowerBoundIndex: number, listings: EventListing[]): number | null => {
  return lowerBoundIndex > 0 ? listings[lowerBoundIndex - 1].seasonalYear : null
}

export default refreshHierarchyIndexes
