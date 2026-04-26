import type ParsedEventMeta from './parsed-event-meta.js'

/** Event data extracted from a markdown source file, before slug derivation and persistence. */
interface ParsedEvent extends ParsedEventMeta {
  /** Event title, lifted from the body's H1. */
  title: string
  /** Body verbatim (markdown), with the H1 line stripped. */
  description: string
}

export default ParsedEvent
