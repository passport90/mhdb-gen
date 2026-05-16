import type EventHeader from '../types/event-header.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Returns the ids of events whose output is stale or missing on disk — those whose
 * `renderedAt` is null or older than `updatedAt`, plus those whose
 * `<outputDirPath>/<seasonalYear>/<season-int>-<season-name>/<position>-<slug>/` directory
 * does not exist. Slug is read directly from each header, pre-derived by the controller.
 *
 * @param headers - Snapshot of every event header, ordered by `(seasonal_year, season, position)`.
 * @param outputDirPath - Output root used to check directory presence.
 * @returns Surrogate ids in input order.
 */
const findEventIdsToRender = (headers: EventHeader[], outputDirPath: string): number[] => {
  /** Ids accumulated for return. */
  const ids: number[] = []

  for (const header of headers) {
    /** Filesystem path where the event's output directory is expected to exist. */
    const dirPath = join(
      outputDirPath,
      String(header.seasonalYear),
      SEASON_PATH_SEGMENTS[header.season],
      `${header.position}-${header.slug}`,
    )

    if (isRenderStale(header) || !existsSync(dirPath)) {
      ids.push(header.id)
    }
  }

  return ids
}

/**
 * Reports whether the rendered output is stale relative to the DB row — its
 * `renderedAt` is null or older than its `updatedAt`.
 *
 * @param header - Event header carrying the timestamps.
 * @returns `true` when the row needs re-rendering on staleness grounds alone.
 */
const isRenderStale = (header: EventHeader): boolean =>
  header.renderedAt === null || header.renderedAt < header.updatedAt

export default findEventIdsToRender
