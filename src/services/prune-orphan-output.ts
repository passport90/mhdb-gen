import { type Dirent, readdirSync, rmSync } from 'node:fs'
import type EventListing from '../types/event-listing.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import { join } from 'node:path'

/** Season number indexed by canonical path segment; reverse of `SEASON_PATH_SEGMENTS`. */
const SEASON_BY_PATH_SEGMENT = new Map(SEASON_PATH_SEGMENTS.map((segment, season) => [segment, season]))

/** Canonical file name of the season-index page, owned by the events hierarchy orchestrator. */
const SEASON_INDEX_FILE_NAME = 'index.html'

/**
 * Removes every entry under `outputDirPath/<year>/<season-int>-<season-name>/` that is not the season-index
 * `index.html` or a canonical `<position>-<slug>` directory whose
 * `(seasonalYear, season, position, slug)` quadruple is in `listings` — orphan event bundles,
 * junk files, and stray non-canonical subdirectories all go. Empty season directories left after
 * that pass (no canonical bundles survive) are removed entirely, sweeping the stale season-index
 * along with them. Year directories left with no remaining season subdirectories are removed for
 * the same reason, sweeping the stale year-index. Year and season entries are descended into
 * only when their name matches the DB's CHECK constraints (4-digit CE year, season 0-3), so
 * non-event entries co-located with the event tree at higher levels are preserved.
 *
 * @param listings - Snapshot of every event row; each `(seasonalYear, season, position, slug)` is
 *   the canonical disk location for that event's output directory.
 * @param outputDirPath - Output root walked for orphan directories.
 * @returns Distinct slots containing at least one entry pruned this run.
 */
const pruneOrphanOutput = (listings: EventListing[], outputDirPath: string): SeasonalSlot[] => {
  /**
   * Set of `(year, season, position-slug)` keys currently in the DB; encoded as `/`-joined
   * strings for membership lookup.
   */
  const validKeySet = new Set(listings.map(buildListingKey))

  /** Slots accumulated for return — one entry per season that lost at least one entry this run. */
  const touchedSlots: SeasonalSlot[] = []

  for (const yearEntry of readdirSync(outputDirPath, { withFileTypes: true })) {
    /** CE year integer parsed from the entry; `null` skips entries that aren't year directories. */
    const seasonalYear = parseSeasonalYear(yearEntry)
    if (seasonalYear === null) continue

    /** Absolute path to the year directory currently being walked. */
    const yearDirPath = join(outputDirPath, yearEntry.name)

    for (const seasonEntry of readdirSync(yearDirPath, { withFileTypes: true })) {
      /** Season index parsed from the entry; `null` skips entries that aren't season directories. */
      const season = parseSeason(seasonEntry)
      if (season === null) continue

      /** Absolute path to the season directory currently being walked. */
      const seasonDirPath = join(yearDirPath, seasonEntry.name)

      /** Slot for this iteration; reused for membership keys and the touched-slots push. */
      const slot: SeasonalSlot = { seasonalYear, season }

      if (pruneSeasonOrphans(seasonDirPath, slot, validKeySet)) {
        touchedSlots.push(slot)
      }

      removeIfNoSubdirs(seasonDirPath)
    }

    removeIfNoSubdirs(yearDirPath)
  }

  return touchedSlots
}

/**
 * Builds the membership key for one event listing — `<year>/<season-segment>/<position>-<slug>`,
 * matching the on-disk path of the rendered bundle directory under the season directory.
 * Slug is read directly from the listing, pre-derived by the controller.
 *
 * @param listing - Event listing whose key is being built.
 * @returns Slash-joined key for `validKeySet`.
 */
const buildListingKey = (listing: EventListing): string =>
  `${listing.seasonalYear}/${SEASON_PATH_SEGMENTS[listing.season]}/${listing.position}-${listing.slug}`

/**
 * Parses `entry` as a season-index directory — accepts only directories whose name is the
 * canonical season segment (`0-winter`, `1-spring`, `2-summer`, `3-fall`) for one of the seasons
 * in the `season` CHECK constraint on the `events` table.
 *
 * @param entry - Filesystem entry from `readdirSync(..., { withFileTypes: true })`.
 * @returns The season integer when `entry` qualifies; `null` otherwise.
 */
const parseSeason = (entry: Dirent): number | null =>
  entry.isDirectory() ? SEASON_BY_PATH_SEGMENT.get(entry.name) ?? null : null

/**
 * Parses `entry` as a 4-digit CE year directory — accepts only directories whose name is a
 * canonical decimal in 1000-9999, mirroring the `seasonal_year` CHECK constraint on the
 * `events` table.
 *
 * @param entry - Filesystem entry from `readdirSync(..., { withFileTypes: true })`.
 * @returns The year integer when `entry` qualifies; `null` otherwise.
 */
const parseSeasonalYear = (entry: Dirent): number | null =>
  entry.isDirectory() && /^[1-9]\d{3}$/.test(entry.name) ? Number(entry.name) : null

/**
 * Removes every entry under `seasonDirPath` that is neither the season-index `index.html` nor a
 * canonical `<position>-<slug>` directory in `validKeySet` — orphan event bundles, junk files,
 * and stray non-canonical subdirectories all go.
 *
 * @param seasonDirPath - Absolute path to the season directory whose children are to be checked.
 * @param slot - The `(seasonalYear, season)` of `seasonDirPath`; used to build the membership key.
 * @param validKeySet - Canonical `(year, season, position-slug)` keys currently in the DB.
 * @returns `true` when at least one entry was removed; `false` otherwise.
 */
const pruneSeasonOrphans = (
  seasonDirPath: string,
  slot: SeasonalSlot,
  validKeySet: Set<string>,
): boolean => {
  /** Tracks whether at least one entry was deleted under `seasonDirPath`. */
  let isSeasonTouched = false

  for (const entry of readdirSync(seasonDirPath, { withFileTypes: true })) {
    if (shouldEntryBePreserved(entry, slot, validKeySet)) continue

    rmSync(join(seasonDirPath, entry.name), { recursive: true })
    isSeasonTouched = true
  }

  return isSeasonTouched
}

/**
 * Removes `dirPath` when it contains no subdirectories; files are ignored on the principle that
 * the season/year hierarchy exists to host event subtrees, and a level with no subtrees has
 * nothing legitimate to serve. A stale `index.html` left over from a previous render goes with
 * the directory under the recursive `rmSync`.
 *
 * @param dirPath - Absolute path to the directory to inspect.
 */
const removeIfNoSubdirs = (dirPath: string): void => {
  /** Direct children of `dirPath` with file-vs-directory information. */
  const entries = readdirSync(dirPath, { withFileTypes: true })
  if (entries.some((entry) => entry.isDirectory())) return

  rmSync(dirPath, { recursive: true })
}

/**
 * Reports whether `entry` should be preserved during the season-level prune — true for the
 * canonical season-index `index.html` (owned by the events hierarchy orchestrator) and for
 * `<position>-<slug>` directories whose `(seasonalYear, season, position, slug)` quadruple is in
 * `validKeySet`. Anything else — orphan event bundles, junk files, stray non-canonical
 * subdirectories — returns false and is eligible for deletion.
 *
 * @param entry - Filesystem entry to classify.
 * @param slot - Seasonal slot supplying the year/season half of the membership key.
 * @param validKeySet - Canonical `(year, season, position-slug)` keys currently in the DB.
 * @returns `true` when the entry should survive the prune.
 */
const shouldEntryBePreserved = (
  entry: Dirent,
  slot: SeasonalSlot,
  validKeySet: Set<string>,
): boolean => {
  if (entry.isFile() && entry.name === SEASON_INDEX_FILE_NAME) return true
  if (!entry.isDirectory()) return false

  return validKeySet.has(`${slot.seasonalYear}/${SEASON_PATH_SEGMENTS[slot.season]}/${entry.name}`)
}

export default pruneOrphanOutput
