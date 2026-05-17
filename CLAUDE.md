# mhdb-gen Conventions

Engineering conventions for `mhdb-gen` — the historical-events encyclopedia generator. Pipeline runtime knowledge (env vars, wrapper scripts, DB reset, personality effort levels) lives in `../docs/pipeline.md`.

## Workflow

Every `git commit` requires explicit user approval. Before committing:

1. Stage the specific files intended for the commit (no `git add -A` / `git add .`).
2. Show the staged diff and the proposed commit message.
3. Wait for the user to approve.
4. Only then run `git commit`.

One commit = one coherent change. No bundled commits. If uncertain whether to split, ask.

## Code Style

### Import sorting

Imports must be sorted to satisfy the `sort-imports` eslint rule. Order by syntax group:

1. **Namespace** — `import * as foo from '...'`
2. **Multiple** — two or more specifiers: `import { A, B } from '...'` or `import { type A, B } from '...'`
3. **Single** — one specifier: `import Foo from '...'`, `import { Foo } from '...'`, `import type Foo from '...'`, or `import type { Foo } from '...'`

Within each group, sort alphabetically by the **first imported name** in ASCII order (uppercase A-Z first, then lowercase a-z).

```ts
// ✅ correct
import * as barModule from './bar'
import * as fooModule from './foo'
import { type Event, findAllEvents } from './repositories/event/find-all'
import Database from 'better-sqlite3'
import type Config from './types/config'
import openDatabase from './db/open'
```

### Naming

#### General

- **Functions** — must start with a verb (e.g. `fetchEvents`, `renderEventPage`, `upsertEvent`)
- **Booleans** — must have a prefix like `is`/`has`/`should`/`are`/`can` (e.g. `isPublished`, `hasSummary`)
- **Everything else** — must be a noun

Adjective-only bindings (`prev`, `next`, `current`, `latest`, `previous`, `recent`) are not acceptable for value bindings — they name a relationship or temporal position, not the value itself. Suffix with the value's noun:

```ts
// ❌ adjective-only — what kind of value? leaks the relationship without the thing
let prev: EventToRender | null = null
let current: EventToRender = findEventById(db, ids[0])
const next = findEventById(db, ids[index + 1])

// ✅ adjective + noun — binds a value, names the value
let prevEvent: EventToRender | null = null
let currentEvent: EventToRender = findEventById(db, ids[0])
const nextEvent = findEventById(db, ids[index + 1])
```

Same applies to function parameters and to fields that hold the relational value: `prevLink`, `nextSiblingEvent`, `currentSlot`. The adjective is the qualifier; the noun is the value.

#### Plural names

A name is plural if and only if the value is an array. Arrays must be plural; non-arrays must be singular — use a descriptive suffix when needed (e.g. `_count` for numbers, `_map`/`_config` for objects). Applies to type names too: `YearIndexInputs` (plural) is wrong for an object type; `YearIndexSource` (singular) is right.

**`<plural>_BY_<key>` is group-by, not index-by.** A constant named `THINGS_BY_KEY` reads as `Record<key, Thing[]>` — multiple things per key. For a single value per key, use `<singular>_BY_<key>` (`Record<key, Thing>`). For an array where the index *is* the key, the indexing scheme is implicit and the name is just the plural noun: `SEASON_NAMES: readonly string[]`, *not* `SEASON_NAMES_BY_NUMBER`. The name reflects the type-shape — switching a constant between map and array forms requires renaming.

### Multi-line declarations

For multi-line declarations (arrays, objects, parameters), place each element on its own line. Opening and closing brackets must be on their own lines, not shared with elements.

```ts
// ✅ correct
const tags = [
  'history',
  'middle-ages',
  'europe',
]

// ❌ wrong — closing bracket on same line as last element
const tags = [
  'history',
  'middle-ages',
  'europe']

// ✅ correct — multi-line function parameters
const findEventsUpdatedSince = (
  db: Database,
  since: Date,
  limit: number,
): Event[] => {
  // ...
}

// ❌ wrong — closing paren on same line as last param
const findEventsUpdatedSince = (
  db: Database,
  since: Date,
  limit: number): Event[] => {
  // ...
}
```

### Module read order

Within a module, the public API / entry point goes first; helpers below. Readers should encounter the dominant function before its supporting cast.

```ts
// ✅ correct — main first, helper below
const main: Controller = async (args, ..., errorStream) => {
  if (args.length === 0) {
    printUsage(errorStream)
    return USAGE_ERROR_EXIT_CODE
  }
  // ...
}

const printUsage = (errorStream: Writable): void => {
  errorStream.write('usage: ...\n')
}

export default main
```

This works even with `const` arrow functions: references inside function bodies don't execute until call time, so source order doesn't constrain runtime correctness as long as no top-level code calls a helper before its declaration line.

Within a module, group elements in this order, with members alphabetical inside each group:

1. **Types / interfaces** — file-private types declared at the top, just under the imports.
2. **Module-level constants** — alphabetical by identifier.
3. **Public API / main function** — single entry point; not subject to alphabetical order, it leads its group of one.
4. **Helpers** — alphabetical by identifier.

The public API stays first among the runtime declarations so readers encounter the dominant function before its supporting cast (see above). Types and constants precede it because they're declarative scaffolding — read once, referenced throughout — and alphabetical ordering inside each group removes the "where did I put X?" lookup tax.

### No default parameters

No default parameter values. Every argument is explicit at the call site — no `(arg = default)` syntax. Reasons: defaults hide a behavior contract that's invisible at the call site (you must read the function signature to know what value you're getting), and changing a default silently changes behavior for every existing caller. Make the call site speak for itself.

When many calls share the same arg set, extract a named base value and let callers spread + override:

```ts
// ❌ default arg hides the value
const findEvents = (db: Database, limit = 50) => { /* ... */ }
findEvents(db) // limit = 50, but the call site doesn't say so

// ✅ explicit; named constant for the common case
const DEFAULT_PAGE_SIZE = 50
findEvents(db, DEFAULT_PAGE_SIZE)
findEvents(db, 100)

// ❌ defaulted options object
const renderEvent = (event: Event, options: RenderOptions = {}) => { /* ... */ }

// ✅ named base; callers spread to override
const BASE_RENDER_OPTIONS: RenderOptions = { showSummary: true, showTags: false }
renderEvent(event, BASE_RENDER_OPTIONS)
renderEvent(event, { ...BASE_RENDER_OPTIONS, showSummary: false })
```

### Guard clauses over branch-laden ternaries

When a function's shape is "if absent, return absent; otherwise build the result," prefer a guard clause + early return over a single-expression ternary. The ternary form pushes the meaningful work (building the result) into the truthy branch at +2 indent and hides the bail-out at the tail where the reader has to scan to find it. The guard form leads with the absence case as a one-liner, then the primary work sits at the function's baseline indent — read top-to-bottom, the reader meets the boring case first and the meaningful case in its natural position.

```ts
// ❌ ternary — primary work nested inside the truthy branch, bail-out trails
const buildSiblingLink = (siblingEvent: EventToRender | null): EventLink | null =>
  siblingEvent !== null
    ? {
      path: buildEventBundlePath(siblingEvent.seasonalYear, siblingEvent.season, siblingEvent.slug),
      titleInlineHtml: renderInlineMarkdown(siblingEvent.title),
    }
    : null

// ✅ guard clause — bail-out first, primary work at baseline indent
const buildSiblingLink = (siblingEvent: EventToRender | null): EventLink | null => {
  if (siblingEvent === null) return null

  return {
    path: buildEventBundlePath(siblingEvent.seasonalYear, siblingEvent.season, siblingEvent.slug),
    titleInlineHtml: renderInlineMarkdown(siblingEvent.title),
  }
}
```

Same family as the optional-chain rule (`value?.field ?? null` over `value === null ? null : value.field`). Principle: when one branch of a conditional is a trivial absence value and the other is non-trivial work, lift the absence handling out of the expression so the work doesn't have to live inside it.

Reserve the ternary form for cases where both branches are short, symmetric expressions of the same shape — `isPublished ? 'live' : 'draft'`, `count > 0 ? items : fallback`. Once one side spans multiple lines or the result type is `T | null` with non-trivial construction on the present side, switch to the guard form.

**Across function boundaries: push the null-check into the helper.** When a private helper is called multiple times with the same null-check ternary at the call site, widen the helper's parameter to `T | null` and put the guard inside. Each call site collapses to one expression.

```ts
// ❌ same null-check repeated at every call site
const viewModel = {
  prevYearLink: prevYear !== null ? buildYearLink(prevYear) : null,
  nextYearLink: nextYear !== null ? buildYearLink(nextYear) : null,
}

const buildYearLink = (year: number): YearLink => ({
  label: String(year),
  indexPagePath: `${year}/index.html`,
})

// ✅ helper handles null itself; call sites are clean
const viewModel = {
  prevYearLink: buildYearLink(prevYear),
  nextYearLink: buildYearLink(nextYear),
}

const buildYearLink = (year: number | null): YearLink | null => {
  if (year === null) return null

  return { label: String(year), indexPagePath: `${year}/index.html` }
}
```

The principle is the same — the absence branch is trivial, so it shouldn't repeat at every consumer. Pulling it inside the helper means future call sites get the right behavior for free.

### Type assertions over runtime narrowing for enforced contracts

When narrowing an `unknown` to a type an upstream contract guarantees — most commonly `catch (err)` from a function whose `@throws` is documented — prefer `as T` over `instanceof T + rethrow`.

```ts
// ❌ instanceof + rethrow — adds plumbing, not defense
try {
  await processEventFile(path)
} catch (err) {
  if (err instanceof EventFileError) {
    messageStream.write(`${err.path}: ${err.message}\n`)
    return OPERATIONAL_ERROR_EXIT_CODE
  }
  throw err
}

// ✅ as — trusts the contract that already narrowed it
try {
  await processEventFile(path)
} catch (err) {
  const eventFileError = err as EventFileError
  messageStream.write(`${eventFileError.path}: ${eventFileError.message}\n`)
  return OPERATIONAL_ERROR_EXIT_CODE
}
```

The runtime check looks defensive but isn't. Under the contract, the rethrow is unreachable. Against contract violations, `instanceof` catches some shapes (the exact class) and misses others (subclasses, structurally-similar objects, errors crossing realm boundaries). It's performative — length without protection. The contract is the proof; the runtime check is theatre.

A test that exercises the rethrow branch makes the same mistake: reaching it requires mocking the upstream into violating its own contract, which tests the mock setup, not real behavior. If a branch is reachable only by breaking an enforced invariant, drop the branch and the test together.

Reserve `instanceof + rethrow` for genuinely uncertain boundaries: third-party libraries that don't document their errors, untyped JS interop, error-channel multiplexing where multiple distinct types can legitimately reach the same catch.

## JSDoc

Every `const`/`let` declaration, type/interface and its fields, and enum and its entries must have a JSDoc comment. Do not add file-level module JSDoc comments — JSDoc belongs on declarations, not files. The goal is hover-driven understanding: any name in the codebase, in source or in tests, should produce an explanatory infobox on hover — readers shouldn't need to cmd-click through to a definition to know what something is.

JSDoc renders as markdown in IDE hover popups — write it accordingly. Use **backticks for code references** (variable names, function names, types, file paths, literal values): `` `mockImplementationOnce` ``, `` `PassThrough` ``, `` `src/types/` ``. Italics and bold are reserved for prose emphasis, not code.

- **Non-functions** — single-line, describe as a noun without articles (`a`, `the`)
- **Functions** — description is one concise sentence starting with a third-person verb (e.g. "Fetches", "Builds"), then a blank line, then `@param`, `@returns`, and `@throws` tags

```ts
/** Maximum number of events rendered per page. */
const EVENTS_PER_PAGE = 50

/**
 * Fetches events updated since the given timestamp.
 *
 * @param db - Opened SQLite database handle.
 * @param since - Lower bound on the `updated_at` column.
 * @returns List of event rows, ordered by `updated_at` ascending.
 */
const findEventsUpdatedSince = (db: Database, since: Date): Event[] => {
  // ...
}
```

**Describe the contract, not the mechanism.** A function's JSDoc describes what the function offers to its caller, not how it's built or who calls it. Drop adjectives like "sequentially", pipeline enumerations like "opens, parses, and upserts", and facts about specific callers like "the bin wires this to stderr". Mechanism earns a mention only when it distinguishes the function from a sibling that does it differently (e.g. `upsertSync` vs `upsertBatch`, line-by-line vs whole-file). Applies recursively: a wrapper function's JSDoc shouldn't enumerate the steps of its inner pipeline.

```ts
// ❌ enumerates the inner pipeline
/** Opens, parses, and upserts a single event file into the database. */
const processEventFile = async (path: string): Promise<void> => { /* ... */ }

// ✅ single contract sentence
/** Persists the event described by the markdown file at the given path. */
const processEventFile = async (path: string): Promise<void> => { /* ... */ }
```

**`@throws` is local-only.** Document errors raised by `throw` in this function — including errors raised by file-private helpers that are part of the same contract. Do **not** document pass-through errors from a separate module's delegate (e.g. `ZodError` from a schema module, errors from a third-party library called as a delegate). Otherwise top-level functions accumulate an unbounded `@throws` list of every error anywhere downstream. The delegate carries its own JSDoc; hover-driven discovery covers the rest.

```ts
// ❌ documents a pass-through ZodError from the schema module
/**
 * @throws `Error` when the input is not valid JSON.
 * @throws `ZodError` when the parsed value does not match the schema.
 */
const parseEventMeta = (meta: string): ParsedEventMeta => {
  let payload: unknown
  try { payload = JSON.parse(meta) } catch (cause) { throw new Error(/* ... */) }
  return parsedEventMetaSchema.parse(payload) // ZodError raised here, by the schema, not this function
}

// ✅ documents only what this function itself raises
/**
 * @throws `Error` when the input is not valid JSON.
 */
```

A consequence of the per-declaration JSDoc rule: avoid destructuring in standalone `const`/`let` declarations — JSDoc attaches to the whole declaration, so individual bindings can't carry their own description. Use separate declarations instead:

```ts
// ❌ avoid
const [command, ...commandArgs] = args

// ✅ prefer
/** Sub-command name. */
const command = args[0]

/** Args passed to the sub-command. */
const commandArgs = args.slice(1)
```

Function-parameter destructuring and `for (...)` loop variable lists (including destructured tuples like `for (const [index, path] of args.entries())`) are fine — TypeScript doesn't surface JSDoc on those positions, so the per-declaration rule has nothing to attach to. The bindings are scoped to a narrow block, so the missing hover is bounded.

## Types

Use `interface` for object shapes and `extends` for composition. Use `type` only when needed (unions, primitives, aliases). Do not use `Pick` or `Omit` — build types constructively from base interfaces.

**No indexed-access type aliases** — `type X = Y['k'][number]` is in the same family as `Pick`/`Omit`: it derives a smaller type by reaching INTO a larger one. Types must compose smaller-to-larger, not derive larger-to-smaller. If a sub-type is consumed by another module (e.g. a view-model builder takes the sub-type as a parameter), promote it from inline-private to its own exported `src/types/` module and import it from both the parent type's file and the consumer.

```ts
// ❌ wrong — view-model builder reaches into EventToRender to extract the row shape
type EventTagRow = EventToRender['tags'][number]

// ✅ right — EventTagRow lives in src/types/event-tag-row.ts; both files import it
import type EventTagRow from '../types/event-tag-row.js'
```

One exported type/interface per module. Private (non-exported) types in the same file are fine for building the exported one — but the moment another module needs the same shape, promote the private type to its own file. Every type/interface and each of its fields must have a JSDoc comment. All types must live in `src/types/`, not inline in code.

No anonymous object types at parameter, return, or variable positions — `(slot: { seasonalYear: number, season: number, slug: string }) => void` is prohibited. Two ways out: (1) lift the shape into a named interface under `src/types/` if it represents a real domain value with reuse potential, or (2) take positional parameters when the arity is small (≤ 3) and the function is local. Don't invent a one-off interface just to satisfy the rule — if the shape doesn't earn a name, it shouldn't exist as an object.

### Organization

`src/types/` starts empty. No subfolders exist by default. Create subfolders only when a real category emerges from repeated use in this codebase — never in anticipation, and never carried over from another project's structure. Name categories after what the types actually describe here, not conventions from elsewhere.

## Constants

All module-level constants live in `src/constants/`, grouped by logical category — one file per group (e.g., `src/constants/exit-codes.ts`).

`src/constants/` follows the same growth rule as `src/types/`: no subfolders by default; create them only when a real category emerges from repeated use, never in anticipation.

## Schemas

Runtime validation schemas (e.g. zod) are first-class modules under `src/schemas/`, one schema per module, named after the type they validate (`src/schemas/parsed-event-meta.ts` exports a schema for `ParsedEventMeta`). The type stays the canonical contract; the schema is annotated `satisfies z.ZodType<T>` to enforce alignment without making the schema the source of truth for the type.

Each schema gets exhaustive unit tests under `test/schemas/`: the happy path plus one `it` block per (field × rejection-mode) pair (missing, wrong primitive type, wrong constraint). Callers of the schema run only the happy-path integration test for the dependency — the per-field rejection tests live in the schema's own test file, not the caller's.

`src/schemas/` follows the same growth rule as `src/types/` and `src/constants/`: no subfolders by default; create them only when a real category emerges from repeated use, never in anticipation.

## Testing

### Test scope

An `it` block tests one branch, not one assertion. The number of `it` blocks for a function equals the number of distinct paths through its body. All post-conditions of a branch — return value, side effects, calls made or not made — belong in the same `it`.

### Independent oracles

A test's expected value must be an independent act of authorship, not derived from the same source as the input. If you compute the expected value by re-running the operation under test (or its inverse), the test is a tautology — it asserts a property of the computation against itself, not the SUT's correctness.

```ts
// ❌ tautology — `2 + 2` re-runs the implementation
assert.equal(add(2, 2), 2 + 2)

// ✅ hardcoded oracle — the test author is the authority
assert.equal(add(2, 2), 4)
```

The same trap shows up in fixtures. If the fixture is built by serializing an object, and the expected output is built by spreading that same object, the test asserts `parse(stringify(x)) ≈ x` — a property of serialization, not of the parser.

```ts
// ❌ fixture and expected share a source
const meta = { seasonalYear: 2026, season: 1, /* ... */ }
const fixtureContent = `---\n${JSON.stringify(meta)}\n---\n\n# Title\n\nbody\n`
const expectedEvent = { ...meta, title: 'Title', description: '\nbody\n' }

// ✅ two independent literals — author writes both sides by hand
const fixtureContent = `---
{"seasonalYear":2026,"season":1,/* ... */}
---

# Title

body
`
const expectedEvent = {
  seasonalYear: 2026,
  season: 1,
  /* ... */
  title: 'Title',
  description: '\nbody\n',
}
```

If a field silently disappears from the parser's output, the literal-on-both-sides version fails; the shared-source version passes because both sides drift together.

### Test structure

`describe` names an environment (precondition); `it` names the behaviour expected under that environment. Wrap sad-path / edge-case `it` blocks in a `describe` that spells out the precondition. The happy-path test lives directly under the outer `describe` with no wrapper, and is the **first** `it` block — readers should see the primary purpose before its edge cases.

```ts
describe('main', () => {
  it('dispatches to the resolved controller and returns its exit code', async () => { /* ... */ })

  describe('when no command is given', () => {
    it('prints usage to the error stream and returns 1', async () => { /* ... */ })
  })
})
```

Reading the names aloud should yield the function's behaviour summary: *"main dispatches…; when no command is given, prints usage…"*

### Top-down London → Chicago

Build top-down, depth-first. The root is tested first with mocked collaborators (London style); each child below is hollow until implemented. As you descend, every time a child becomes real, the parent's mock of that child is *demoted* (not duplicated): the parent's seam test now exercises the real child end-to-end. By the time the leaf is implemented, the whole spine from root to leaf has no internal mocks (Chicago).

Only the test whose subject is "the child is invoked correctly" gets promoted, and only along the happy path. Edge cases of the child stay in the child's own tests. This keeps integration tests cheap and prevents combinatorial explosion as the spine grows.

Tests of the parent's own internal branches stay where they are — that's parent-side behaviour, not seam behaviour.

The "keep a double" list is narrower than "all I/O." The test is reach: things you can run locally and reset deterministically stay real with isolation — SQL via a test database (Rails-style: separate, fresh per run, transactional rollback), filesystem via tmp directories with the path injected via DI. Things outside that reach — third-party APIs, real wall-clock time — keep doubles. "No internal mocks" doesn't mean "mock all I/O."

A surviving mock is a signal: either the child below it is unimplemented (expected during the descent) or the parent's test is conflating seam with branch logic (split it).

## Commits

Use Conventional Commits for all commit messages. Prefix with one of:
`feat:`, `fix:`, `build:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`, `style:`, `perf:`

Pick by motivation, not by diff shape: `perf:` when the change is motivated by performance (e.g., O(3N) → O(N) via single-pass cursor — even when the diff is structural). `refactor:` for structural changes with no behavior or perf delta. `style:` for binding-shape changes (destructuring → separate consts) that touch neither logic nor structure.
