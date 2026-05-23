# Hierarchy refresh — settled perf shape, don't 're-optimize'

`refreshHierarchyIndexes` re-renders the touched years/slots *and* each touched entry's closest occupied neighbor on either side — `expandWithNeighborSlots` / `expandWithNeighborYears` add those neighbors because a neighbor's `prev/next` link reaches across the touched entry and goes stale when it appears or vanishes.

Every step is anchored on a binary search over the sorted `listings`:

- **Neighbor expansion** — one `findLowerBound` per touched entry, then a forward slide past that entry's own listings. The slide is bounded by the ≤5-events-per-season cap, so it's O(1) per entry — *not* the O(n) it superficially looks like.
- **Per-page render** — `renderYearIndex` / `renderSeasonIndex` build their source with `deriveYearIndexSource` / `deriveSeasonIndexSource`, each of which `findLowerBound`s to the year/slot's first event, then walks only that year/slot (again cap-bounded).

Overall: **O((Y+S)·log n)** for the year/slot hierarchy — Y+S = years and slots refreshed (touched + neighbors), within a constant factor of the touched count C — plus one intrinsic O(n) pass for `renderRootIndex`'s decade histogram (the root index is a function of the whole corpus). Cost scales with the size of the sync, not the size of the database.

**Why this note exists.** `deriveXSource` originally scanned `listings` from index 0 on every call — O(n) per render, so a refresh was O((Y+S)·n), the render scan being the silent dominant term that an earlier version of this note omitted (it miscredited the neighbor slide as the perf story). `106141c` fixed the derivation (binary-search + cap-bounded walk); mrdb-gen's twin landed as `d40c919`.

**Three cleaner-looking alternatives were considered and rejected as worse here — don't swap any in:**

- **Two-binary-search neighbor lookup** (`upperBound` instead of the slide, O(C·log n)) — doubles the binary searches to delete a slide the ≤5 cap already makes O(1). Pure overhead.
- **Sort-then-merge** (O(n + C·log C)) — wins only at large C (a full rebuild), loses for the common small-C incremental sync.
- **Precomputed first-event-index map** — an O(n) build paid every sync even for a one-event change, tying edit cost to corpus size rather than change size. A throwaway lookup map beats binary-searching an already-sorted source only when lookups M ≳ N/log N; an incremental sync touches a handful of slots, so M ≪ N/log N. Binary-search the sorted `listings` — the same tool every other step here already uses.
