# mhdb-gen

Generator for the **mhdb** (historical events) static-site encyclopedia. Reads entries from a SQLite database and writes a dependency-free HTML site. Single binary with three subcommands: `upsert` (markdown → SQLite), `assign-season` (map events to seasonal years/positions), `generate` (SQLite → HTML with incremental rebuild).

## Configuration

Environment variables:

- `MHDB_DB` — path to the SQLite database file.
- `MHDB_OUTPUT_DIR_PATH` — directory where the generated site is written.

## Development

Requires Node 24+ and pnpm.

```
pnpm install
pnpm build
node dist/bin/mhdb-gen.js <subcmd>
pnpm test
pnpm lint
```
