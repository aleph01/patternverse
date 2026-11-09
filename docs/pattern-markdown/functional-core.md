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
shadowed by iteration locals. Canonical bindings support `!ask`, `!timer`, `!rate 0..10`,
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
coercion, destructuring or record update syntax. `Optional[T]` and `None` support
explicit absence; use `optional ?? fallback` for a type-checked, lazy default.

Declare pure helpers before flow steps, with explicit parameter and result types:

```pattern
fn clean(s: text) -> text => s |> trim |> normalize_whitespace
fn score(entry: {answer: text, score: number}) -> number => entry.score
fn high(n: number) -> boolean => n >= 7
fn add(total: number, n: number) -> number => total + n
```

Helpers may call earlier helpers and use only their explicit parameters. They
cannot capture inputs/chat state, recurse, perform effects or call later helpers.
They are not stored function values or higher-order helper parameters. Inline callbacks
support lambdas as described below. Helper bodies are pinned with their source and lowered to pure
invocations; they need no new persisted runtime frame.

`value |> f(a, b)` means `f(value, a, b)`. `value |> trim` calls `trim(value)`.
Pipelines have lower precedence than arithmetic/comparison/Boolean operators.
Multiline pipelines use a leading `|>` on each continuation line. Lists and records
may span lines while their delimiters are open.

### Explicit mapping pipes

`items |>> f(a, b)` maps over one list level, calling `f(item, a, b)` for each
element. `items |>> f` calls `f(item)` for each element. Stages accept named pure
helpers or built-ins, with the item inserted as the first argument. Additional
arguments are ordinary expressions; list arguments are passed whole, without
zipping, scalar expansion, or recursive broadcasting.

```pattern
:language 1
:output cleaned: list[text]

fn clean(value: text) -> text => value |> trim |> normalize_whitespace

notes = ["  Take a pause  ", "Ask   for help"]
cleaned = notes |>> clean
summary = notes
  |>> trim
  |>> normalize_whitespace
  |> join("; ")
bounded = [12, -2, 4] |>> clamp(0, 10)
-> end
```

Both pipe operators share the lowest precedence and associate left to right. A
continuation line may start with either `|>` or `|>>`. Ordinary `|>` still passes
the whole left value to a function; it never maps implicitly.

`|>>` requires a typed list and preserves its order and length. An empty list
returns a typed empty result, with the stage checked even when no elements run.
A list-valued result stays nested: `[[1, 2], [3]] |>> count` produces `[2, 1]`,
and mapping `split(",")` over text produces a list of lists. Use `|> flatten`
explicitly to remove a layer. Mapping stages remain pure and use the existing
map evaluation limits and saved-run representation. Full broadcasting and
implicit currying are not part of this operator.

### Pure built-ins

| Function | Contract |
| --- | --- |
| `trim`, `lowercase`, `normalize_whitespace` | Text to text; deterministic, no AI |
| `clamp(number, minimum, maximum)` | Number; errors if minimum exceeds maximum |
| `concat(a, b)` | Two texts or two lists of the same element type |
| `count(items)` | Number of list/choices elements |
| `map(items, helper)` | Named helper takes one element; preserves order and length |
| `filter(items, helper)` | Named helper returns Boolean; preserves kept elements/order |
| `flatten(items)` | Removes exactly one list layer |
| `shuffle(items, seed)` | Pure permutation of a list/choices using an explicit text seed |
| `fold(items, seed, helper)` | Named helper takes accumulator then item; returns seed type |
| `reduce(items, helper)` | Seedless left reduction: callback `(T, T) -> T`, returning `Optional[T]` |
| `join(items, separator)` | Join `list[text]`; an empty list returns empty text |
| `split(text, separator)` | Split by a nonempty literal separator, preserving empty parts |
| `contains(value, item)` | Case-sensitive substring or structural list membership |
| `starts_with(text, prefix)`, `ends_with(text, suffix)` | Literal, case-sensitive text boundary checks |
| `sum(numbers)` | Finite numeric total; zero for an empty list |
| `min(numbers)`, `max(numbers)` | `Optional[number]`; absent for an empty list |
| `first(items)`, `last(items)` | `Optional[T]`; absent for an empty list |
| `find(items, helper)` | First predicate match as `Optional[T]`; otherwise absent |
| `any(items, helper)`, `all(items, helper)` | Short-circuit Boolean predicates; empty lists return false/true respectively |
| `distinct(items)` | Structural equality, retaining each first occurrence in order |

`find`, `any`, and `all` take pure callbacks with one element parameter and a Boolean
result. They stop as soon as their answer is known. `first`, `last`, and `find`
reject optional element types because directly nested `Optional` is unsupported.
Text operations use literal Unicode text with no implicit case folding or regular
expressions. Empty boundary fragments match; splitting on an empty separator fails.
`contains` and `distinct` use the same structural equality as `==`, including stable
choice IDs and equality of positive/negative zero. Existing helpers using newly
introduced built-in names retain their meaning and take precedence over those built-ins.

`??` associates right to left, below arithmetic and above comparisons, Boolean
operators, and pipelines. Both sides are checked; only an absent left side evaluates
the fallback. A fallback must have the optional's contained type.

Without a seed, `order = shuffle(items)` or `order = items |> shuffle` is a run-scoped
whole-binding operation. Its order is stable across pause/resume and replay; it cannot
be nested in pure expressions or helper bodies. See [shuffle](shuffle.md).

Empty map/filter results retain their element type; an empty fold returns the seed.
Use `map(helper) |> flatten` for pure flat-map; no `yield*` or composition operator
is needed in this phase. Callback positions accept named helpers and inline lambdas;
wrap a built-in in a helper or use `trim(_)`.

## Inline lambdas

`map`, `filter`, `fold`, `reduce`, `find`, `any`, and `all` accept both named inline lambdas
and Scala-style underscore placeholders. Parameter types are inferred from the input
list and, for fold, the seed. Named `fn` helpers continue to work unchanged.

```pattern
:language 1
:output result
threshold = 7
scores = [2, 8, 9]
result = {
    high: filter(scores, _ >= threshold),
    names: map([{name: "Pause"}, {name: "Ask for help"}], _.name),
    cleaned: map(["  Pause  "], trim(_)),
    total: fold(scores, 0, _ + _)
}
-> end
```

Each `_` occurrence introduces a separate parameter in source order. `_ + _` is a
two-parameter lambda, with accumulator first and item second in fold. To reuse one
parameter, give it a name; `map(scores, _ * _)` is an arity error.

```pattern
:language 1
:output result
threshold = 7
scores = [2, 8, 9]
groups = [[2, 8], [7, 9]]
result = {
    squares: map(scores, n => n * n),
    middle: filter(scores, n => n >= 3 and n <= 8),
    total: fold(scores, 0, (acc, n) => acc + n),
    groups: map(groups, group => filter(group, _ >= threshold))
}
-> end
```

Inline lambdas may read earlier immutable bindings and enclosing lambda parameters.
Parameters have lexical scope, and captured values are supplied explicitly to the
checked transform. Named `fn` declarations still cannot capture surrounding bindings.
Name the outer parameter when nesting transforms: `map(groups, filter(_, _ > 0))`
is rejected with a diagnostic rather than guessing placeholder ownership.

Bodies are pure expressions. Predicates must return Boolean; fold must return the
seed's type; map infers its output element type even for an empty input. Stored,
returned, and dynamically constructed function values are not supported. Effects,
recursive callbacks, forward captures, and unseeded shuffle cannot occur in a lambda.
The existing expression expansion, work, and value limits apply to bodies and captures.

## Reduce without a seed

`reduce(items, callback)` combines values from left to right, using the first element
as the initial accumulator. The callback takes accumulator then next item, both of
type `T`, and must return `T`. It accepts named helpers and both inline lambda syntaxes.

```pattern
:language 1
:output result
scores = [2, 4, 8]
result = reduce(scores, _ + _) ?? 0
-> end
```

Equivalently, use `reduce(scores, (total, value) => total + value)` or pass a declared
two-parameter helper. The result is `Optional[T]`: a single-element list returns its
element without calling the callback; an empty list returns `None`. Callback types
are checked in both cases. `??` provides an explicit default rather than guessing an
identity value. For a pipeline, write `(scores |> reduce(_ + _)) ?? 0`.

Use `fold` when supplying a seed or changing the accumulator type. `reduce` rejects
optional element types because directly nested `Optional` types are unsupported.

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
