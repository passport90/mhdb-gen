/** Hyperlink to a peer event — root-relative path and pre-rendered inline title. */
interface EventLink {
  /** Root-relative URL pointing to the peer event's bundle, e.g. `1066/3/battle-of-hastings/index.html`. */
  path: string
  /** Peer event's title rendered as inline HTML — markdown processed, no wrapping `<p>` tag. */
  titleInlineHtml: string
}

export default EventLink
