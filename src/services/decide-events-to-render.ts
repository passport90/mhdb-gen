import type EventListing from '../types/event-listing.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Decides which events need rendering this run — those whose `renderedAt` is null or
 * older than `updatedAt`, plus those whose
 * `<outputDirPath>/<seasonalYear>/<season-int>-<season-name>/<position>-<slug>/` directory
 * does not exist. The result is the input subset; listings are passed through so the
 * pre-derived slug rides forward into the renderer.
 *
 * @param listings - Snapshot of every event listing, ordered by `(seasonal_year, season, position)`.
 * @param outputDirPath - Output root used to check directory presence.
 * @returns Listings of events to render this run, preserving input order.
 */
const decideEventsToRender = (listings: EventListing[], outputDirPath: string): EventListing[] =>
  listings.filter(listing => isRenderStale(listing) || isOutputDirMissing(listing, outputDirPath))

/**
 * Reports whether the event's expected output directory is absent from disk.
 *
 * @param listing - Event listing carrying the slot coordinates and pre-derived slug.
 * @param outputDirPath - Output root the directory is resolved against.
 * @returns `true` when the directory does not exist.
 */
const isOutputDirMissing = (listing: EventListing, outputDirPath: string): boolean =>
  !existsSync(join(
    outputDirPath,
    String(listing.seasonalYear),
    SEASON_PATH_SEGMENTS[listing.season],
    `${listing.position}-${listing.slug}`,
  ))

/**
 * Reports whether the rendered output is stale relative to the DB row — its
 * `renderedAt` is null or older than its `updatedAt`.
 *
 * @param listing - Event listing carrying the timestamps.
 * @returns `true` when the row needs re-rendering on staleness grounds alone.
 */
const isRenderStale = (listing: EventListing): boolean =>
  listing.renderedAt === null || listing.renderedAt < listing.updatedAt

export default decideEventsToRender
