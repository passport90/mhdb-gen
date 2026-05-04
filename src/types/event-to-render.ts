import type EventKeyBundle from './event-key-bundle.js'
import type ParsedEvent from './parsed-event.js'

/** Event row materialized for rendering — the parsed authored fields plus the DB-side fields the renderer needs. */
interface EventToRender extends EventKeyBundle, ParsedEvent {
  /** Hex SHA-256 of the illustration; `null` when the event has no illustration. */
  illustrationHash: string | null
}

export default EventToRender
