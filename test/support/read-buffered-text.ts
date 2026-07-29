import type { Readable } from 'node:stream'

/**
 * Reads every chunk currently buffered in a readable stream and joins them into one string.
 *
 * A single `read()` returns only the first buffered chunk, so a stream written to more than
 * once must be drained in a loop to observe everything its writer produced.
 *
 * @param stream - Readable stream to drain.
 * @returns Text of every buffered chunk in write order; empty string when nothing is buffered.
 */
const readBufferedText = (stream: Readable): string => {
  /** Text accumulated from the chunks drained so far. */
  let bufferedText = ''

  /** Chunk most recently pulled off `stream`, or `null` once it holds nothing more. */
  let chunk = stream.read()

  while (chunk !== null) {
    bufferedText += chunk.toString()
    chunk = stream.read()
  }

  return bufferedText
}

export default readBufferedText
