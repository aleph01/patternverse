# Phase 2 — functional core

Use `:language 1`, including these additions. The same Rust compiler/runtime executes the desktop
editor preview, library Patterns and chat. No PWA interpreter changes or automatic
rewrites of existing files are included. Version-one compiled forms, source hashes
and saved runs retain their interpretation; active runs remain pinned.

## Bind values consistently

```pattern
:language 1
:output entry
answer = !ask {
  What would you like to put into words?
}
entry = {answer: answer, ratings: [2, 4], reviewed: false}
-> end
```

`=` introduces an immutable binding, never reassignment. Enclosing names cannot be
shadowed by iteration locals. Canonical bindings support `!ask`, `!rate 0..10`,
`!choose [flags]`, `!rank [flags]`, `!agent`, `!turn`, `!collect`, `!use child.name`,
and `!refine[rounds=4, renewable] initial_text`. Existing `:with` input contracts,
selection parameters and refinement participant controls are unchanged. `!show`
remains a standalone effect. Old instruction spellings remain supported.

Effects are permitted only as whole binding statements—not nested in a list,
record, function argument or pure pipeline. Phase 3 adds explicitly marked
[semantic binding statements](semantic-ai.md). `?loop[max]` retains its current spelling
and UI cancellation contract. No new event or implicit consent semantics exist.

## Typed data and pure helpers

Lists are homogeneous: `[1, 2]` is `list<number>`. Records have structural types:
`{answer: "hello", score: 4}`. Use commas between items or fields; trailing commas
are allowed. Nest either form and access named bindings through paths like
`entry.score`. Empty lists require an element annotation: `[]:text`,
`[]:list<number>` or `[]:{answer: text, score: number}`. There is no implicit
coercion, optional field, null, destructuring or record update syntax yet.

Declare pure helpers before flow steps, with explicit parameter and result types:

```pattern
fn clean(s: text) -> text => s |> trim |> normalize_whitespace
fn score(entry: {answer: text, score: number}) -> number => entry.score
fn high(n: number) -> boolean => n >= 7
fn add(total: number, n: number) -> number => total + n
```

Helpers may call earlier helpers and use only their explicit parameters. They
cannot capture inputs/chat state, recurse, perform effects or call later helpers.
They are not callable values: no lambdas, closures, stored functions or higher-order
helper parameters. Helper bodies are pinned with their source and lowered to pure
invocations; they need no new persisted runtime frame.

`value |> f(a, b)` means `f(value, a, b)`. `value |> trim` calls `trim(value)`.
Pipelines have lower precedence than arithmetic/comparison/Boolean operators.
Multiline pipelines use a leading `|>` on each continuation line. Lists and records
may span lines while their delimiters are open.

| Function | Contract |
| --- | --- |
| `trim`, `lowercase`, `normalize_whitespace` | Text to text; deterministic, no AI |
| `clamp(number, minimum, maximum)` | Number; errors if minimum exceeds maximum |
| `concat(a, b)` | Two texts or two lists of the same element type |
| `count(items)` | Number of list/choices elements |
| `map(items, helper)` | Named helper takes one element; preserves order and length |
| `filter(items, helper)` | Named helper returns Boolean; preserves kept elements/order |
| `flatten(items)` | Removes exactly one list layer |
| `fold(items, seed, helper)` | Named helper takes accumulator then item; returns seed type |

Empty map/filter results retain their element type; an empty fold returns the seed.
Use `map(helper) |> flatten` for pure flat-map; no `yield*` or composition operator
is needed in this phase. Map/filter/fold accept named user-defined helpers, not
arbitrary function-valued expressions; wrap a built-in in a helper when needed.

## Interactive traversal and explicit output

```pattern
entries = each question in questions {
  raw = !ask {
    {{question}}
  }
  cleaned = clean(raw)
  -> yield {question: question, answer: cleaned}
}
```

`each` evaluates its source once, in order, and runs one iteration at a time. It
accepts a list or choices; an empty source performs no interactions and returns a
typed empty list. Each iteration gets fresh immutable locals. It can pause, resume,
invoke pinned child Patterns and restart at the same pending interaction. Receipt
replay prevents a repeated response from adding another result.

**`each` requires exactly one final `-> yield expression`**. A `!collect` may also
use an explicit final yield. The yielded type determines the result's element type:
scalar, record or nested list. Intermediate fields are not implicitly exported.
Bodies are straight-line: no labels, branches, early exits or nested same-run
collections/loops/refinements. Put a reusable nested procedure in a child Pattern.

An open `entries = !collect { ... }` still requires a finite `:max`, optionally
`:min`, and the existing participant add/finish confirmation. Its final `yield`
chooses what each completed entry exports. Version-one collections continue to
export their existing implicit record fields.

## Limits and migration

Helpers are limited to 32 declarations, eight parameters each, 4,096 expanded
expression nodes and 24 expanded nesting levels (so saved runs stay reloadable).
Expressions retain the 16 KiB source and bounded nesting/operator
limits. Evaluation has a 100,000-operation budget. New pure forms also limit lists
to 10,000 elements, records to 256 fields, text to 1 MiB, and cumulative intermediate
value accounting to 16 MiB per expression and combined yielded collection. Runtime traversal uses the existing
host collection limit (1,000 by default); these limits fail explicitly, never
silently truncate values or run AI instead. A failing reply leaves the prior
pending state intact.

Keep the language declaration at 1. Optionally rewrite bindings and add a final
`yield` to a collection when choosing its output explicitly. Without yield,
version-one collections still export their implicit record fields. Nothing is
migrated automatically, and a new revision never changes an already running
Pattern. Earlier phase-two files declaring language 2 remain readable and retain
their requirement for explicit collection yields. Old implicit `!ask`/`!show`
Markdown bodies still treat `name = text` as content; prefer explicit braces for
new canonical bindings. Global events, first-class functions and general flow
declarations remain deferred.

See [the runnable reflection example](examples/functional-reflection.pattern.md).
