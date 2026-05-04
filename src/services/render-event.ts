import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import type EventToRender from '../types/event-to-render.js'
import buildEventPage from './build-event-page.js'
import { join } from 'node:path'

/**
 * Writes the event's HTML page to `<outputDirPath>/<year>/<season>/<slug>/index.html`, copying the
 * illustration alongside it when the event has one.
 *
 * @param event - Event to render.
 * @param outputDirPath - Output root.
 */
const renderEvent = (event: EventToRender, outputDirPath: string): void => {
  /** Per-event directory; canonical disk location for this event's output bundle. */
  const eventDirPath = join(
    outputDirPath,
    String(event.seasonalYear),
    String(event.season),
    event.slug,
  )

  mkdirSync(eventDirPath, { recursive: true })
  writeFileSync(join(eventDirPath, 'index.html'), buildEventPage(event))

  if (event.illustrationHash === null) return

  /** Blob store sibling to the SQLite file, mirroring the upsert-side convention. */
  const blobDirPath = `${process.env.MHDB_DB_PATH as string}.blobs`

  copyFileSync(
    join(blobDirPath, `${event.slug}.png`),
    join(eventDirPath, 'illustration.png'),
  )
}

export default renderEvent
