# mhdb-gen Conventions

Engineering conventions for `mhdb-gen` — the historical-events encyclopedia generator. Pipeline runtime knowledge (env vars, DB reset) lives in `../docs/pipeline.md`.

@./docs/shared-conventions.md

## Architecture

See [`docs/shared-architecture.md`](docs/shared-architecture.md) for architecture concerns shared with `mrdb-gen` (incremental sync data-keyed contract, hierarchy refresh perf shape, `<base href>` rule, view-model rules, slug derivation, service-verb taxonomy, repo patterns, test patterns, migrations rule, etc.). No mhdb-specific architecture yet — when it emerges, it lives in `docs/architecture/`.
