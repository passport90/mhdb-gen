import type EventHeader from '../types/event-header.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Returns the events that need rendering this run — those whose `renderedAt` is null or
 * older than `updatedAt`, plus those whose
 * `<outputDirPath>/<seasonalYear>/<season-int>-<season-name>/<position>-<slug>/` directory
 * does not exist. The result is the input subset; headers are passed through so the
 * pre-derived slug rides forward into the renderer.
 *
 * @param headers - Snapshot of every event header, ordered by `(seasonal_year, season, position)`.
 * @param outputDirPath - Output root used to check directory presence.
 * @returns Headers of events to render this run, preserving input order.
 */
const findEventsToRender = (headers: EventHeader[], outputDirPath: string): EventHeader[] =>
  headers.filter(header => isRenderStale(header) || isOutputDirMissing(header, outputDirPath))

/**
 * Reports whether the event's expected output directory is absent from disk.
 *
 * @param header - Event header carrying the slot coordinates and pre-derived slug.
 * @param outputDirPath - Output root the directory is resolved against.
 * @returns `true` when the directory does not exist.
 */
const isOutputDirMissing = (header: EventHeader, outputDirPath: string): boolean =>
  !existsSync(join(
    outputDirPath,
    String(header.seasonalYear),
    SEASON_PATH_SEGMENTS[header.season],
    `${header.position}-${header.slug}`,
  ))

/**
 * Reports whether the rendered output is stale relative to the DB row — its
 * `renderedAt` is null or older than its `updatedAt`.
 *
 * @param header - Event header carrying the timestamps.
 * @returns `true` when the row needs re-rendering on staleness grounds alone.
 */
const isRenderStale = (header: EventHeader): boolean =>
  header.renderedAt === null || header.renderedAt < header.updatedAt

export default findEventsToRender
