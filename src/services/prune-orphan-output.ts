import { type Dirent, readdirSync, rmSync } from 'node:fs'
import type EventHeader from '../types/event-header.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import { join } from 'node:path'

/**
 * Removes slug directories under `outputDir` whose `(seasonalYear, season, slug)` triple is
 * not in `headers`, then any season directory left empty by that pass, then any year directory
 * left empty in turn. Year and season entries are descended into only when their name matches
 * the DB's CHECK constraints (4-digit CE year, season 0-3), so non-event entries co-located
 * with the event tree are preserved.
 *
 * @param headers - Snapshot of every event row; each `(seasonalYear, season, slug)` is the
 *   canonical disk location for that event's output directory.
 * @param outputDir - Output root walked for orphan directories.
 * @returns Seasons whose subtree was touched by deletions, so their indexes can be refreshed.
 */
const pruneOrphanOutput = (headers: EventHeader[], outputDir: string): SeasonalSlot[] => {
  /** Set of `(year, season, slug)` triples currently in the DB; encoded as `/`-joined strings for membership lookup. */
  const validKeySet = new Set(headers.map(h => `${h.seasonalYear}/${h.season}/${h.slug}`))

  /** Slots accumulated for return — one entry per season that lost at least one slug-dir. */
  const touchedSlots: SeasonalSlot[] = []

  for (const yearEntry of readdirSync(outputDir, { withFileTypes: true })) {
    /** CE year integer parsed from the entry; `null` skips entries that aren't year directories. */
    const seasonalYear = parseSeasonalYear(yearEntry)
    if (seasonalYear === null) continue

    /** Absolute path to the year directory currently being walked. */
    const yearDir = join(outputDir, yearEntry.name)

    for (const seasonEntry of readdirSync(yearDir, { withFileTypes: true })) {
      /** Season index parsed from the entry; `null` skips entries that aren't season directories. */
      const season = parseSeason(seasonEntry)
      if (season === null) continue

      /** Absolute path to the season directory currently being walked. */
      const seasonDir = join(yearDir, seasonEntry.name)

      /** Slot for this iteration; reused for membership keys and the touched-slots push. */
      const slot: SeasonalSlot = { seasonalYear, season }

      if (pruneOrphanSlugsInSeason(seasonDir, slot, validKeySet)) {
        touchedSlots.push(slot)
      }

      removeIfEmpty(seasonDir)
    }

    removeIfEmpty(yearDir)
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
 * Removes slug directories under `seasonDir` whose `(seasonalYear, season, slug)` triple is
 * not in `validKeySet`.
 *
 * @param seasonDir - Absolute path to the season directory whose children are to be checked.
 * @param slot - The `(seasonalYear, season)` of `seasonDir`; used to build the membership key.
 * @param validKeySet - Canonical `(year, season, slug)` triples currently in the DB.
 * @returns `true` when at least one slug directory was removed; `false` otherwise.
 */
const pruneOrphanSlugsInSeason = (
  seasonDir: string,
  slot: SeasonalSlot,
  validKeySet: Set<string>,
): boolean => {
  /** Tracks whether at least one slug-dir was deleted under `seasonDir`. */
  let isSeasonTouched = false

  for (const slugEntry of readdirSync(seasonDir, { withFileTypes: true })) {
    if (!slugEntry.isDirectory()) continue
    if (validKeySet.has(`${slot.seasonalYear}/${slot.season}/${slugEntry.name}`)) continue

    rmSync(join(seasonDir, slugEntry.name), { recursive: true })
    isSeasonTouched = true
  }

  return isSeasonTouched
}

/**
 * Removes `dir` when it contains no entries; otherwise leaves it in place.
 *
 * @param dir - Absolute path to the directory to inspect.
 */
const removeIfEmpty = (dir: string): void => {
  if (readdirSync(dir).length === 0) {
    rmSync(dir, { recursive: true })
  }
}

export default pruneOrphanOutput
