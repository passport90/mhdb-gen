# Incremental sync is data-keyed — a generator change needs a full rebuild

`sync` is incremental: it re-renders only what changed since the last run. `decideEventsToRender` selects events whose `renderedAt` is null or older than `updatedAt`, or whose output directory is missing; `refreshHierarchyIndexes` short-circuits entirely when no event was rendered or pruned, and otherwise refreshes only the touched years/slots plus their occupied neighbors. Every one of those signals keys off **data** — DB rows and on-disk output presence. The gating is the optimization that keeps a one-event sync O(change), not O(corpus); the year/season gating in particular scales with year/slot count and must stay.

A **generator** change trips none of those signals. Editing a template (`*.eta`), a presenter (`build-*`), a render service (`render-*`), the eta engine, or any other code on the render path changes the output bytes without touching an `updated_at` column or removing an output directory — so an incremental sync after a generator-only change re-renders nothing and the stale output survives. The `<base href="">` → `<base href="./">` fix in `root-index.eta` is the worked example: the served `index.html` stayed stale until an unrelated content change happened to force a re-render.

This is not a bug in the gating — it is the gating's correctness contract, narrower than "sync always produces correct output":

**Incremental sync trusts that only data changed since the last sync. If the generator changed — any template or any code on the render path — that trust is void: delete the whole output directory (`$MHDB_OUTPUT_DIR_PATH`) and re-sync for a full rebuild.**

A full delete is safe: nothing under `$MHDB_OUTPUT_DIR_PATH` is a source of truth. `sync` rebuilds the whole tree from sources that live outside it — every event directory comes back missing so `isOutputDirMissing` forces a re-render of all events (each re-copying its illustration from the blob store at `${MHDB_DB_PATH}.blobs`, a sibling of the SQLite file), every slot is then touched so every index page refreshes, and assets re-mirror via `copyDirectory`.
