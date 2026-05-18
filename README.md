# mhdb-gen

Generator for the **mhdb** (historical events) static-site encyclopedia. Reads entries from a SQLite database and writes a dependency-free HTML site.

Single binary, two subcommands:

- `upsert` — markdown (+ illustrations) → SQLite. Each batch runs in one transaction; a failure rolls back the database side of the run.
- `sync` — SQLite → HTML. Re-renders events whose `rendered_at` is stale or whose output directory is missing, refreshes hierarchy indexes for any touched subtree, mirrors static assets, and prunes orphan output directories.

## Configuration

All three environment variables are required:

- `MHDB_DB_PATH` — path to the SQLite database file.
- `MHDB_OUTPUT_DIR_PATH` — directory where the generated site is written.
- `MHDB_ASSETS_DIR_PATH` — directory mirrored into the output root after each `sync`.

## Usage

```
mhdb-gen upsert <path>...      # mixed list of .md and .png files
mhdb-gen sync                  # reconcile output tree to DB state
```

Progress lines (`[i/n] …`) and errors are written to stderr; the process exit code reports success or failure.

## Development

Requires Node 24+ and pnpm.

```
pnpm install
pnpm build
node dist/bin/mhdb-gen.js <subcmd>

pnpm test          # tsc + node --test
pnpm lint
pnpm typecheck
pnpm validate      # typecheck + lint + test
```

Database schema lives under `migrations/`.
