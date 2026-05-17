/** Source files for one event in a single upsert run: the markdown entry and its illustration. */
interface EventSource {
  /** Path to the markdown file authored for the event. */
  entryFilePath: string
  /** Path to the sibling illustration PNG. */
  illustrationFilePath: string
}

export default EventSource
