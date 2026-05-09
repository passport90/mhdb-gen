import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Computes the SHA-256 hex digest of the file at the given path.
 *
 * @param filePath - File whose contents are hashed.
 * @returns SHA-256 hex digest of the file's contents.
 */
const hashFile = (filePath: string): string => {
  /** Raw bytes read from the file. */
  const content = readFileSync(filePath)

  return createHash('sha256').update(content).digest('hex')
}

export default hashFile
