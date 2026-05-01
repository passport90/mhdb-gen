import type ParsedEventMeta from '../types/parsed-event-meta.js'
import parsedEventMetaSchema from '../schemas/parsed-event-meta.js'

/**
 * Parses JSON-encoded event metadata into a validated `ParsedEventMeta`.
 *
 * @param meta - JSON-encoded metadata source.
 * @returns Validated `ParsedEventMeta`.
 * @throws `Error` when the input is not valid JSON.
 */
const parseEventMeta = (meta: string): ParsedEventMeta => {
  /** JSON-decoded payload, untyped until the schema validates it. */
  let payload: unknown

  try {
    payload = JSON.parse(meta)
  } catch (cause) {
    throw new Error(`malformed metadata (must be a JSON object): ${(cause as Error).message}`, { cause })
  }

  return parsedEventMetaSchema.parse(payload)
}

export default parseEventMeta
