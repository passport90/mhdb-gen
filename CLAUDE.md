# mhdb-gen Conventions

Engineering conventions for `mhdb-gen` — the historical-events encyclopedia generator. Pipeline runtime knowledge (env vars, DB reset) lives in `../docs/pipeline.md`.

@./docs/shared-conventions.md

## Architecture

Architecture decisions live in `docs/architecture/` — consult before refactoring hot paths or changing render output:

- [`incremental-sync-data-keyed.md`](docs/architecture/incremental-sync-data-keyed.md) — incremental sync's gating is data-keyed; a generator change requires a full output-dir rebuild.
- [`hierarchy-refresh-perf-shape.md`](docs/architecture/hierarchy-refresh-perf-shape.md) — settled perf shape of `refreshHierarchyIndexes`; three plausible "cleanups" are rejected.
- [`base-href.md`](docs/architecture/base-href.md) — `<base href>` must never be empty; templates must produce URLs that survive a dumb static server.
