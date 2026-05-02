/** Source files for one event in a single upsert run: the markdown entry and, optionally, its illustration. */
interface EventSource {
  /** Path to the markdown file authored for the event. */
  entryFilePath: string
  /** Path to the sibling illustration PNG, or `null` when this upsert run carries no illustration for the event. */
  illustrationFilePath: string | null
}

export default EventSource
