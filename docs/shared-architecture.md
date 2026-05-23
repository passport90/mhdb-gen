# Shared architecture across mhdb-gen and mrdb-gen

Architecture decisions and tripwires that apply to both projects' sync pipelines. Project-specific divergences live in each project's CLAUDE.md and `docs/architecture/`. Where mhdb-gen (events) and mrdb-gen (records, artists) differ on specifics, the differences are called out inline.

## Incremental sync is data-keyed — a generator change needs a full rebuild

`sync` is incremental per resource: it re-renders only what changed since the last run. The decision-side filter (`decideEventsToRender` on mhdb; `decideRecordsToRender` / `decideArtistsToRender` on mrdb) selects rows whose `renderedAt` is null or older than `updatedAt`, or whose on-disk output is missing (`isOutputDirMissing` for event bundle dirs; `isOutputFileMissing` for record/artist `.html` files). The refresh orchestrator (`refreshHierarchyIndexes` on mhdb; `refreshRecordHierarchyIndexes` / `refreshArtistHierarchyIndexes` on mrdb) short-circuits entirely when no row was rendered or pruned, and otherwise refreshes only the touched years/slots/letters plus, for events/records, their occupied neighbors. Every one of those signals keys off **data** — DB rows and on-disk output presence. The gating is the optimization that keeps a one-row sync O(change), not O(corpus); the year/season and letter gating must stay.

A **generator** change trips none of those signals. Editing a template (`*.eta`), a presenter (`build-*`), a render service (`render-*`), the eta engine, or any other code on the render path changes the output bytes without touching an `updated_at` column or removing an on-disk file — so an incremental sync after a generator-only change re-renders nothing and the stale output survives. The `<base href="">` → `<base href="./">` fix in mhdb-gen's `root-index.eta` is the worked example: the served `index.html` stayed stale until an unrelated content change happened to force a re-render.

This is not a bug in the gating — it is the gating's correctness contract, narrower than "sync always produces correct output":

**Incremental sync trusts that only data changed since the last sync. If the generator changed — any template or any code on the render path — that trust is void: delete the whole output directory (`$MHDB_OUTPUT_DIR_PATH` / `$MRDB_OUTPUT_DIR_PATH`) and re-sync for a full rebuild.**

A full delete is safe: nothing under the output directory is a source of truth. `sync` rebuilds the whole tree from sources that live outside it — every event bundle / record file / artist file comes back missing so `isOutput{Dir,File}Missing` forces a re-render of all rows. mhdb additionally re-copies each event's illustration from the blob store at `${MHDB_DB_PATH}.blobs`, a sibling of the SQLite file; mrdb has no companion blobs. Every touched slot/letter then triggers an index refresh, and assets re-mirror via `copyDirectory`.

## Hierarchy refresh — settled perf shape, don't 're-optimize'

The refresh orchestrator (`refreshHierarchyIndexes` on mhdb; `refreshRecordHierarchyIndexes` on mrdb) re-renders the touched years/slots *and* each touched entry's closest occupied neighbor on either side — `expandWithNeighborSlots` / `expandWithNeighborYears` add those neighbors because a neighbor's `prev/next` link reaches across the touched entry and goes stale when it appears or vanishes. mrdb's `refreshArtistHierarchyIndexes` needs no neighbor expansion — letter pages carry no prev/next links.

Every step is anchored on a binary search over the sorted `listings`:

- **Neighbor expansion** — one `findLowerBound` per touched entry, then a forward slide past that entry's own listings. The slide is bounded by the ≤5-entries-per-season cap, so it's O(1) per entry — *not* the O(n) it superficially looks like.
- **Per-page render** — `renderYearIndex` / `renderSeasonIndex` build their source with `deriveYearIndexSource` / `deriveSeasonIndexSource`, each of which `findLowerBound`s to the year/slot's first entry, then walks only that year/slot (again cap-bounded).

Overall: **O((Y+S)·log n)** for the year/slot hierarchy — Y+S = years and slots refreshed (touched + neighbors), within a constant factor of the touched count C — plus one intrinsic O(n) pass for the root/records-index's decade histogram (a function of the whole corpus). Cost scales with the size of the sync, not the size of the database.

**Why this note exists.** `deriveXSource` originally scanned `listings` from index 0 on every call — O(n) per render, so a refresh was O((Y+S)·n), the render scan being the silent dominant term. The fix landed as `106141c` (mhdb-gen) and `d40c919` (mrdb-gen): binary-search + cap-bounded walk.

**Three cleaner-looking alternatives were considered and rejected as worse here — don't swap any in:**

- **Two-binary-search neighbor lookup** (`upperBound` instead of the slide, O(C·log n)) — doubles the binary searches to delete a slide the ≤5 cap already makes O(1). Pure overhead.
- **Sort-then-merge** (O(n + C·log C)) — wins only at large C (a full rebuild), loses for the common small-C incremental sync.
- **Precomputed first-entry-index map** — an O(n) build paid every sync even for a one-row change, tying edit cost to corpus size rather than change size. A throwaway lookup map beats binary-searching an already-sorted source only when lookups M ≳ N/log N; an incremental sync touches a handful of slots, so M ≪ N/log N. Binary-search the sorted `listings` — the same tool every other step here already uses.

## `<base href>` must never be empty

Use `<base href="./">` for depth 0 (the root index); deeper pages use `<base href="../">`, `<base href="../../">`, etc. matching their depth. An empty `<base href="">` trips Safari/WebKit URL resolution and mangles relative links like `1066/index.html` (mhdb) or `records/1900/index.html` (mrdb) to `/1066` / `/records/1900` — which then 404s on any non-rewriting static server (`http-server`, `python3 -m http.server`). The dumb static server is the correct serving choice; the templates must produce URLs that survive it.

## View models carry only template-ready data

No `rootBasePath` field — each template hardcodes `<base href="…">` for its fixed depth. Labels are pre-stringified: `yearLabel: string`, not `year: number`. Cross-page URLs are precomputed in the view model: `yearIndexPagePath`, `recordPagePath` / `eventBundlePath`, `firstArtistLink.path` — never built inline in templates. `SeasonIndexPageViewModel` carries `seasonLabel` ('Winter 1900') only — no `season: number` and no `seasonName: string` (H1 is just `seasonLabel`, body is bare `<body>` with no `data-season`). Season-card labels are bare names ('Winter') from `SEASON_NAMES: readonly string[]`, not 'Winter 1900' from `buildSeasonLabel`.

## View-model builders take a single source-object arg

`buildSeasonIndexViewModel(source: SeasonIndexSource)`, `buildYearIndexViewModel(source: YearIndexSource)`. Slot is never unpacked into `(year, season, …)`; the source folds the discriminator in. Internal helpers like `buildEventEntry(slot, event)` / `buildRecordEntry(slot, record)` follow the same rule — pass the `SeasonalSlot` whole, not unpacked.

## Season segment encoding

The segment between `<year>/` and the per-entry name is `<season-int>-<season-name>` (`0-winter`, `1-spring`, `2-summer`, `3-fall`), *not* bare `0`/`1`/`2`/`3`. Humans browsing the served output see meaningful folder names; the SQL `season` integer stays the schema key. The canonical table is `SEASON_PATH_SEGMENTS: readonly string[]` in `src/constants/season-path-segments.ts`. `buildSeasonPathSegment` is **not** a presenter — direct array indexing is preferred since the four season names are immutable.

## Slug is derived, never stored

The `events`, `records`, and `artists` tables have no `slug` column. Slug = `slugify(title-or-name)`, computed at the listing-hydration seam (`hydrateListing` in `sync.ts` / `sync-records.ts` / `sync-artists.ts`), never inside repos (thin-repo rule). Records/events: `({ ...row, slug: slugify(row.title) })`. Artists: `({ ...row, slug: slugify(row.name), firstLetter: extractLowercaseFirstLetter(row.name) })`. mhdb has an additional upsert-side seam: `slugify(parsedEvent.title)` in `processEventFile.ts` supplies the slug to `syncIllustrationBlob` for the blob filename. mrdb has no upsert-side seam — neither records nor artists carry a companion blob.

## URL stability across slugify changes

Not preserved (derivation is live). Slugify is treated as a stable contract; if it ever changes, all URLs regenerate on next sync.

## Index-page source pattern

Each hierarchy render service derives a single source-typed object from `listings` and threads it into the matching view-model builder as one arg.

- `YearIndexSource = { year, seasonsInYear, prevYear, nextYear }` (`src/types/year-index-source.ts`) — built by `deriveYearIndexSource` (private in `renderYearIndex`), consumed by `buildYearIndexViewModel(source)`.
- `SeasonIndexSource = { slot, <resource>sInSlot, prevSlot, nextSlot }` (`src/types/season-index-source.ts`) — built by `deriveSeasonIndexSource` (private in `renderSeasonIndex`), consumed by `buildSeasonIndexViewModel(source)`. The accumulated-array field is `eventsInSlot: EventListing[]` on mhdb, `recordsInSlot: RecordListing[]` on mrdb — the field name follows the resource swap.

Each source folds the input discriminator (`year` / `slot`) into the result even though the render service already knew it — keeps the builder seam at one arg. The type lives in `src/types/` because two modules consume it (render service + view-model builder).

## Pure-function helpers in `src/services/`

Pure-function helpers that drive a domain query live in `src/services/`, not `src/presenters/` — presenters are view-shape transforms; these are domain queries consumed by services.

## Service-verb taxonomy

- `find<X>` — in-memory search for an existing thing (e.g., repo row hydrators).
- `decide<X>` — predicate/filter (`decideEventsToRender` / `decideRecordsToRender`). Canonical shape: one-line `listings.filter(listing => isRenderStale(listing) || isOutput{Dir,File}Missing(listing, outputDirPath))` with two private predicate helpers. Records/artists use `isOutputFileMissing` (records/artists are `.html` files); events use `isOutputDirMissing` (events are bundle dirs).
- `collect<X>` — array gather (`collectYearsWithEvents`).
- `derive<X>` — compute a structured value from inputs, possibly passing some through (`deriveYearIndexSource`, `deriveSeasonIndexSource`).
- `build<X>` — presenter-layer view-shape transforms only (`buildYearIndexViewModel`, `buildEventBundlePath`). Don't use in services even when the function constructs an object — use `derive` instead.
- `compare<X>` — pure tri-state (`-1 | 0 | 1`) comparator over a domain type (`compareSlots` over `SeasonalSlot`). Lives in `src/services/`, not `src/helpers/`, even though it drives no pipeline step: the helpers/services split is domain-agnostic-vs-domain, not pure-vs-impure. Generic comparators (`compareNumbers`) and generic algorithms (`findLowerBound`) stay in `src/helpers/`.

## Templates are pure substitution

Allowed: `<%= it.field %>`, `<% if (x !== null) %>`, `<% if (boolField) %>`, `<% for (const x of collection) %>`, `<% if (length === 0) %>`. **Banned**: method calls (`.charAt()`, `.toLowerCase()`), inline URL construction, compound conditions (`a !== null || b !== null`). All formatting belongs in the view-model builder.

## Eta auto-trim gotcha

eta's default `autoTrim` is `[false, 'nl']` — leading whitespace preserved, trailing `\n` stripped after any `%>` at end-of-line. This applies to ALL tag types (`<% %>`, `<%= %>`, `<%~ %>`) regardless of what they emit. A loop body whose last line ends with a value tag (`...<%= credit.suffix %>`) will collapse all iterations onto a single line because every iteration's trailing `\n` is consumed. Two workarounds: (a) end the body line with static text so the `\n` is preserved (body lines end with `</a>`, `</li>`, `</span>`), (b) encode the newline INTO the value the tag emits — make the field a string that itself contains `'\n'` (the `ArtistCredit.suffix` pattern). The inline `<% if (cond) { %>X<% } %>` pattern at end-of-line has the same problem because the closing `<% } %>` is still the last tag. Workaround (a) is preferred when feasible.

## Repo SQL pattern parallel

No `as Record<string, SQLOutputValue>[]` (or `... | undefined`) casts on `.all()` / `.get()` results. Node's `node:sqlite` types already give the right shape. Pick the cast pattern by what the function returns:

- **Row hydrator returning an object** (`.get(...)` → object, e.g. `findEventById`, `findRecordBodyById`): end-of-chain `as XBody` cast on the returned object literal. Inside the literal, fields are `row?.field` with NO per-field cast.
- **Row hydrator returning an array of objects** (`.all().map(row => ({ ... }))`, e.g. `findAllEventListings`, `findAllRecordListings`): end-of-chain `as <ReturnType>[]` cast on the mapped array. Inside the callback, fields are `row?.field` with NO per-field cast.
- **Scalar projection returning primitives** (`.all().map(row => row.field as Type)`, e.g. `findYearsWithEvents`): no optional-chain, no end-of-chain cast — one per-field cast that *is* the value.
- **Small object projection in a `.all().map`**: per-field cast via `row?.field as Type`.

## No defensive `?? null` on nullable DATETIME columns

`node:sqlite` already returns `string | null` for nullable DATETIME, so `(row?.field as string | null | undefined) ?? null` is theatre. End-of-chain cast covers the shape. SQL aliases: `SELECT seasonal_year AS year` (short alias) on slice-3 hierarchy repos; full camelCase aliases (`AS seasonalYear`) on slice-4+ row hydrators where the alias matches the type field name exactly.

## Repo thinness — one thin per-table query per repo

No multi-query merging in a single function. Pivot JOINs go in their own repos. Slim body fetchers (`findEventById` / `findRecordBodyById` / `findArtistBodyById`) return body-only; the renderer composes them with listing fields via private `hydrate*(listing, body)` helpers. The `*ToRender` types NEVER carry pivoted child collections.

## Migrations are append-only history — except when the DB is resettable

Production-style discipline says add a new numbered up/down pair for every schema change (e.g. `004.0_drop_x.sql` + `004.1_drop_x.sql`). But while the DB is treated as resettable from `mhdb-content/` / `mrdb-content/` — drop, re-apply, re-upsert — **edit the original up-migration in place** rather than stacking a drop-and-recreate dance on top (e.g. the slug column was removed by editing `002.0_create_records_table.sql`, not by adding `004.0_drop_records_slug_column.sql`). Once the DB stops being treated as resettable, switch to append-only.

## Test patterns

General shapes followed across the codebase. Each `it` covers one branch; multiple post-conditions (return value, file written, DB side effect, progress stream) live in the same `it`. Happy path leads each `describe` directly; sad-path variants go in nested `describe`s that name the precondition.

- **Page tests** (`build-*-page.test.ts`): describe-scope `baseViewModel` fixture; happy `it` does `assert.strictEqual(renderedHtml, expectedHtml)` against a hand-authored multi-line template-literal of the full HTML. Sad-path null-describes use spread-override and `.includes()` assertions. One describe per null axis, never combined.
- **View-model tests** (`build-*-view-model.test.ts`): describe-scope fixtures; happy `it` does per-field `strictEqual` + `deepStrictEqual`; one null-describe per axis.
- **Single-page renderer tests** (`render-event.test.ts`, `render-record.test.ts`, `render-artist.test.ts`): no DB — pass the slim `*ToRender` literal + the separate pivot-row literal directly to the SUT; call the SUT; `readFileSync` the written file; `.includes()` for title + key anchors.
- **Batch renderer tests** (`render-events.test.ts`, `render-records.test.ts`, `render-artists.test.ts`): describe-scope fixtures covering interesting transitions; `PassThrough` for `messageStream`; happy `it` asserts (a) progress lines, (b) file content, (c) `markXxxRendered` side effect, (d) any returned value. One `when the listings list is empty` null-describe asserts no writes + every `rendered_at` still null.
- **Hierarchy orchestrator** (`refresh-*hierarchy-indexes.test.ts`): mtime-based assertions — the orchestrator's job is dispatch, not content. Each expected output path is pre-seeded with empty content and a deep-past mtime; the SUT must advance mtime on every path it dispatches to. `existsSync` would pass even when a stale page from a previous sync survives — the neighbor case demands the mtime test.
- **Row-hydrator repo tests** (`find-*-by-id.test.ts`): one happy `it` per repo — single `INSERT`, call SUT, assert the row fields. No pivot setup.
- **Pivot-JOIN repo tests** (`find-*-credits-by-*-id.test.ts`): `beforeEach` seeds the anchor row. Helper inserts. Happy `it` inserts multiple rows out-of-order + one unrelated row and asserts ordering + exclusion. **FK pitfall**: the unrelated pivot row needs a real id — insert a second anchor row and use `lastInsertRowid`, not a fabricated number (FK validation fails the test setup). One null-describe asserts empty array when the anchor has no children.
- **Listings repo tests** (`find-all-*-listings.test.ts`): `insertXxxRow(..., renderedAt, updatedAt)` helper bypasses the timestamp trigger; happy `it` inserts rows out of order and asserts the SUT's ordering. For row-mapper SUTs with per-row branches (e.g., mrdb's `findAllRecordListings` JOIN/EXISTS), vary the credit shape across fixtures so one query execution exercises every row-shape branch.
- **`decide-*-to-render.test.ts`**: pure file-system test (no DB). 4 listings covering the `(isDbStale, fileExists)` grid; `seedOutputFile(...)` / `seedOutputDir(...)` helper creates the on-disk artifact at the same path the SUT computes; one happy `it` asserts full-reference subset equality. No separate sad-path describes — the grid covers them.
- **`mark-*-rendered.test.ts`**: insert one row with `updated_at` fixed and `rendered_at=null`, call SUT, assert `rendered_at !== null` AND `updated_at` unchanged (proves the trigger's `OF` clause excludes the `rendered_at` write from bumping `updated_at`).
- **Tiny presenter tests**: single-`it` happy-path with hardcoded literal oracle. No describes.
