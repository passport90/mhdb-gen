-- Historical events: the primary entity. Each row is a single
-- event with a stable slug, a title, a markdown description, a
-- date range, and a seasonal placement slot — the slot is what
-- determines where the event renders on the site. Dates are
-- stored as TEXT in ISO 8601 because SQLite has no native DATE
-- type; the format is enforced via the CHECK constraint below.
CREATE TABLE events (
    -- Surrogate primary key.
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    -- URL-safe identifier derived from the title via slugify
    -- (NFKD → ASCII → lowercase → non-word stripped → runs
    -- collapsed to `-`). On collision a numeric suffix is
    -- appended (`-2`, `-3`, …); the dedup excludes self by id
    -- so re-upserting an unchanged title is idempotent.
    slug          TEXT     NOT NULL UNIQUE,
    -- Display title for the event page. Authored as the H1 in
    -- the source markdown; the parser lifts it into this column.
    title         TEXT     NOT NULL,
    -- Full event body in markdown, with the H1 line stripped —
    -- the renderer re-emits the title from `title` on its own.
    -- Always present.
    description   TEXT     NOT NULL,
    -- Inclusive start of the event in ISO 8601 (YYYY-MM-DD).
    start_date    TEXT     NOT NULL,
    -- Inclusive end; same format and >= start_date.
    end_date      TEXT     NOT NULL,
    -- Calendar year of the seasonal slot. CHECK matches the date
    -- GLOB's implicit format constraint (CE 1000-9999). Note
    -- that December events belong to the *next* year's winter
    -- (see `season` below), so seasonal_year may be one ahead of
    -- the start_date's calendar year.
    seasonal_year INTEGER  NOT NULL CHECK (seasonal_year BETWEEN 1000 AND 9999),
    -- Season index within the seasonal year:
    --   0 = Winter (December of the *previous* calendar year
    --       through February — e.g. an event on 2025-12-15 sits
    --       in seasonal_year=2026, season=0)
    --   1 = Spring (March through May)
    --   2 = Summer (June through August)
    --   3 = Fall   (September through November)
    -- Stored as INTEGER for ordering and compactness; the
    -- renderer maps to display labels.
    season        INTEGER  NOT NULL CHECK (season BETWEEN 0 AND 3),
    -- Abstract ordering integer within the (seasonal_year,
    -- season) bucket. Filenames use 1-based positive integers
    -- by convention but the column accepts any integer
    -- (negatives, gaps, far-future placeholders) — only the
    -- relative order matters for rendering.
    position      INTEGER  NOT NULL,
    -- Row insertion timestamp; defaulted on INSERT.
    created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
    -- Last modification timestamp; maintained by the trigger
    -- below on every UPDATE.
    updated_at    DATETIME NOT NULL DEFAULT (datetime('now')),

    -- Format and ordering check for the date pair. GLOB enforces
    -- 4-digit year + 2-digit month + 2-digit day, which implicitly
    -- limits the supported range to CE 1000-9999. end_date must
    -- not precede start_date.
    CONSTRAINT valid_date_range CHECK (
        start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND
        end_date   GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND
        end_date >= start_date
    ),

    -- Slot uniqueness: two events cannot occupy the same
    -- (seasonal_year, season, position).
    CONSTRAINT unique_slot UNIQUE (seasonal_year, season, position)
);

-- Maintains events.updated_at on every UPDATE. SQLite has no
-- ON UPDATE clause for column defaults, so a trigger is the
-- standard pattern for timestamp maintenance.
CREATE TRIGGER events_update_timestamp
AFTER UPDATE ON events
BEGIN
    UPDATE events SET updated_at = datetime('now') WHERE id = NEW.id;
END;
