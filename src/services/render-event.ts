import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import type EventToRender from '../types/event-to-render.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import buildEventPage from '../presenters/build-event-page.js'
import buildEventViewModel from '../presenters/build-event-view-model.js'
import { join } from 'node:path'

/**
 * Writes the event's HTML page to
 * `<outputDirPath>/<year>/<season-int>-<season-name>/<position>-<slug>/index.html`, copying the
 * illustration alongside it when the event has one.
 *
 * @param event - Event to render.
 * @param prevEvent - Previous event in the same season, or `null` at the start of the season.
 * @param nextEvent - Next event in the same season, or `null` at the end of the season.
 * @param outputDirPath - Output root.
 */
const renderEvent = (
  event: EventToRender,
  prevEvent: EventToRender | null,
  nextEvent: EventToRender | null,
  outputDirPath: string,
): void => {
  /** Per-event directory; canonical disk location for this event's output bundle. */
  const eventDirPath = join(
    outputDirPath,
    String(event.seasonalYear),
    SEASON_PATH_SEGMENTS[event.season],
    `${event.position}-${event.slug}`,
  )

  /** View model fed to the eta template. */
  const viewModel = buildEventViewModel(event, prevEvent, nextEvent)

  mkdirSync(eventDirPath, { recursive: true })
  writeFileSync(join(eventDirPath, 'index.html'), buildEventPage(viewModel))

  if (event.illustrationHash === null) return

  /** Blob store sibling to the SQLite file, mirroring the upsert-side convention. */
  const blobDirPath = `${process.env.MHDB_DB_PATH as string}.blobs`

  copyFileSync(
    join(blobDirPath, `${event.slug}.png`),
    join(eventDirPath, 'illustration.png'),
  )
}

export default renderEvent
