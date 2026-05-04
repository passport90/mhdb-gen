import { readdirSync, rmSync } from 'node:fs'
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
    if (!yearEntry.isDirectory()) continue
    if (!/^[1-9]\d{3}$/.test(yearEntry.name)) continue

    /** Year directory's name as the CE year integer (1000-9999, mirrors the DB CHECK). */
    const seasonalYear = Number(yearEntry.name)

    /** Absolute path to the year directory currently being walked. */
    const yearDir = join(outputDir, yearEntry.name)

    for (const seasonEntry of readdirSync(yearDir, { withFileTypes: true })) {
      if (!seasonEntry.isDirectory()) continue
      if (!/^[0-3]$/.test(seasonEntry.name)) continue

      /** Season directory's name as the season index (0-3, mirrors the DB CHECK). */
      const season = Number(seasonEntry.name)

      /** Absolute path to the season directory currently being walked. */
      const seasonDir = join(yearDir, seasonEntry.name)

      /** Tracks whether at least one slug-dir was deleted under this season. */
      let isSeasonTouched = false

      for (const slugEntry of readdirSync(seasonDir, { withFileTypes: true })) {
        if (!slugEntry.isDirectory()) continue
        if (validKeySet.has(`${seasonalYear}/${season}/${slugEntry.name}`)) continue

        rmSync(join(seasonDir, slugEntry.name), { recursive: true })
        isSeasonTouched = true
      }

      if (isSeasonTouched) {
        touchedSlots.push({ seasonalYear, season })
      }

      if (readdirSync(seasonDir).length === 0) {
        rmSync(seasonDir, { recursive: true })
      }
    }

    if (readdirSync(yearDir).length === 0) {
      rmSync(yearDir, { recursive: true })
    }
  }

  return touchedSlots
}

export default pruneOrphanOutput
