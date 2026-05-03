/** Argv-supplied illustration PNG paired with the SHA-256 of its contents. */
interface IllustrationSource {
  /** Argv path to the illustration PNG. */
  filePath: string

  /** SHA-256 hex digest of the file at `filePath`. */
  hash: string
}

export default IllustrationSource
