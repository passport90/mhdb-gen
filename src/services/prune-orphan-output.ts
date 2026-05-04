import { type Dirent, readdirSync, rmSync } from 'node:fs'
import type EventHeader from '../types/event-header.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import { join } from 'node:path'

/**
 * Removes slug directories under `outputDirPath` whose `(seasonalYear, season, slug)` triple is
 * not in `headers`, then any season directory left empty by that pass, then any year directory
 * left empty in turn. Year and season entries are descended into only when their name matches
 * the DB's CHECK constraints (4-digit CE year, season 0-3), so non-event entries co-located
 * with the event tree are preserved.
 *
 * @param headers - Snapshot of every event row; each `(seasonalYear, season, slug)` is the
 *   canonical disk location for that event's output directory.
 * @param outputDirPath - Output root walked for orphan directories.
 * @returns Seasons whose subtree was touched by deletions, so their indexes can be refreshed.
 */
const pruneOrphanOutput = (headers: EventHeader[], outputDirPath: string): SeasonalSlot[] => {
  /** Set of `(year, season, slug)` triples currently in the DB; encoded as `/`-joined strings for membership lookup. */
  const validKeySet = new Set(headers.map(h => `${h.seasonalYear}/${h.season}/${h.slug}`))

  /** Slots accumulated for return — one entry per season that lost at least one slug-dir. */
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

      if (pruneOrphanSlugsInSeason(seasonDirPath, slot, validKeySet)) {
        touchedSlots.push(slot)
      }

      removeIfEmpty(seasonDirPath)
    }

    removeIfEmpty(yearDirPath)
  }

  return touchedSlots
}

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
 * Parses `entry` as a season-index directory — accepts only directories whose name is `0`
 * through `3`, mirroring the `season` CHECK constraint on the `events` table.
 *
 * @param entry - Filesystem entry from `readdirSync(..., { withFileTypes: true })`.
 * @returns The season integer when `entry` qualifies; `null` otherwise.
 */
const parseSeason = (entry: Dirent): number | null =>
  entry.isDirectory() && /^[0-3]$/.test(entry.name) ? Number(entry.name) : null

/**
 * Removes slug directories under `seasonDirPath` whose `(seasonalYear, season, slug)` triple is
 * not in `validKeySet`.
 *
 * @param seasonDirPath - Absolute path to the season directory whose children are to be checked.
 * @param slot - The `(seasonalYear, season)` of `seasonDirPath`; used to build the membership key.
 * @param validKeySet - Canonical `(year, season, slug)` triples currently in the DB.
 * @returns `true` when at least one slug directory was removed; `false` otherwise.
 */
const pruneOrphanSlugsInSeason = (
  seasonDirPath: string,
  slot: SeasonalSlot,
  validKeySet: Set<string>,
): boolean => {
  /** Tracks whether at least one slug-dir was deleted under `seasonDirPath`. */
  let isSeasonTouched = false

  for (const slugEntry of readdirSync(seasonDirPath, { withFileTypes: true })) {
    if (!slugEntry.isDirectory()) continue
    if (validKeySet.has(`${slot.seasonalYear}/${slot.season}/${slugEntry.name}`)) continue

    rmSync(join(seasonDirPath, slugEntry.name), { recursive: true })
    isSeasonTouched = true
  }

  return isSeasonTouched
}

/**
 * Removes `dirPath` when it contains no entries; otherwise leaves it in place.
 *
 * @param dirPath - Absolute path to the directory to inspect.
 */
const removeIfEmpty = (dirPath: string): void => {
  if (readdirSync(dirPath).length === 0) {
    rmSync(dirPath, { recursive: true })
  }
}

export default pruneOrphanOutput
