import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'

/**
 * Applies every up-migration under the project's `migrations/` directory to the
 * database at the given path, in lexicographic filename order.
 *
 * @param dbPath - Filesystem path to the SQLite database file.
 */
const applyMigrations = (dbPath: string): void => {
  /** Path to the project's `migrations/` directory. */
  const migrationsDir = join(process.cwd(), 'migrations')

  /** Up-migration filenames under `migrationsDir`, sorted ascending. */
  const upMigrationFilenames = readdirSync(migrationsDir)
    .filter(name => /^\d+\.0_.+\.sql$/.test(name))
    .sort()

  /** Database handle opened to apply the schema. */
  const db = new DatabaseSync(dbPath)

  try {
    for (const filename of upMigrationFilenames) {
      /** Migration SQL read from `filename`. */
      const sql = readFileSync(join(migrationsDir, filename), 'utf8')

      db.exec(sql)
    }
  } finally {
    db.close()
  }
}

export default applyMigrations
