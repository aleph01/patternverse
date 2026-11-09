# Core Pattern Language

Pattern Language combines authored Markdown, typed immutable values, participant
interactions, and explicit control flow. The website, source preview, and Mira use
one Rust compiler/runtime. See [readable authoring](readability.md) for the current
binding, optional-question, and structured-branch conventions.

## Questions and ratings

```pattern
:language 1
:output focus
:output energy

focus = !ask {
  What would you like to focus on?
}
energy = !rate -2.5..10 {
  :prefer slider
  :low "Very little"
  :high "Plenty"
  How much energy is available for {{focus}}?
}
-> end
```

Standalone questions accept participant text, including an intentionally empty
answer. Use a [form](../practices.md) for required nonblank fields or several
questions submitted together. `notes = !ask [optional] { ... }` makes a form field
optional; optional answers are still explicit submitted text values.

Ratings accept finite numbers within inclusive literal bounds. Decimal and negative
values are allowed. Invalid types, NaN, infinity, and out-of-range values leave the
interaction pending. `:prefer`, `:low`, and `:high` are presentation metadata; they
cannot change the numeric contract.

Prefer explicit braces. The older shorthand body form remains supported: subsequent
Markdown belongs to an action until the next recognized boundary. Attributes precede
body text. Control blocks always require braces.

## Immutable values and expressions

`name = expression` creates an immutable binding. There is no implicit coercion,
truthiness, reassignment, or generated-code evaluation. Equality requires compatible
types; choice equality compares semantic IDs, not labels. Lists and records compare
recursively. Arithmetic and ordered comparisons require numbers; Boolean operators
require booleans.

From strongest to weakest, the core precedence is:

1. Parentheses, literals, references, field paths, and function calls.
2. Unary minus.
3. Multiplication `*`.
4. Addition/subtraction `+` and `-`.
5. Non-chained comparisons `<`, `<=`, `>`, `>=`, `==`, `!=`.
6. `not`.
7. Short-circuit `and`.
8. Short-circuit `or`.
9. Pipelines `|>` and explicit mapping pipes `|>>`, evaluated left to right.

See the [functional core](functional-core.md) for typed lists and records, pure named
helpers, built-ins, pipelines, traversal, and explicit yielded results. Arithmetic
producing a non-finite value rejects the transition atomically, including any
just-submitted response. No partial bindings or receipts are committed.

Names use ASCII letters or underscore followed by letters, digits, underscores, or
hyphens. A hyphenated name is one token: write `left - right` for subtraction. Language
keywords and built-in names are reserved where required by the compiler. Expressions
are limited to 16 KiB and bounded nesting/operators; functional evaluation also has
explicit operation and value-size budgets.

## Local branches and exact matches

```pattern
:language 1
:output next_step

energy = !rate 0..10 {
  How much energy is available?
}
?branch {
  :when energy >= 8 {
    next_step = "Try a focused work period."
  }
  :when energy >= 4 {
    next_step = "Choose one small action."
  }
  :else {
    next_step = "Make room to rest."
  }
}
!show {
  A possible next step: {{next_step}}
}
-> end
```

Branch evaluates conditions in order and runs the first true arm, or the final
`:else`. Match evaluates its subject once and selects an exact case:

```pattern
:language 1
selection = !choose {
  What would help?
  - start: "Take one step"
  - rest: "Pause for now"
}
?match selection {
  :case start {
    !show {
      Choose one manageable step.
    }
  }
  :case rest {
    !show {
      You can leave this here.
    }
  }
}
-> end
```

A static choice match may omit `:else` only when every offered ID is covered. Closed
enum matches follow the same rule for variants. Other subjects and unknown/dynamic
choice catalogues need a final fallback. Text, number, and Boolean cases are matching
literals; choice cases are IDs. No ranges, arbitrary case expressions, list matching,
or duplicate cases are accepted.

An arm normally continues after the decision; `-> end` completes explicitly. Values
used after a decision must be definitely assigned on every continuing path, with
matching types. The compiler also rejects any possible earlier assignment on the
same path. Every completion path must supply every declared output. Conditions are
conservatively considered possible, including constant conditions.

## Compatible label syntax

Older `label:` declarations, `-> label`, and `:case value -> label` /
`:when condition -> label` dispatch remain supported. Targets must point strictly
forward. Unknown or duplicate labels, backward/self jumps, labels without a following
instruction, and a user-defined `end:` label are rejected. Labels create no scope.
Use local arms for new code; labels and escaping jumps are not allowed inside them.

Every reachable path must explicitly terminate. Falling off the source is an error.
Unreachable authored statements remain type-checked and produce source diagnostics;
they cannot satisfy a reachable path's output requirements.

## Markdown and interpolation

Use `{{binding}}` or known fields such as `{{entry.answer}}` to display values.
A choice displays its label. Interpolated participant and AI text remains data and
is never parsed as Pattern source. The host owns safe Markdown rendering.

Prefix reserved syntax with a backslash when it should be displayed literally:

```pattern
:language 1
!show {
  \!ask example
  \:option example "Label"
  \-> end
  \}
  Show literal \{{unknown}}.
}
-> end
```

`\{{` is a literal opening delimiter, `\\` is a literal backslash, and other Markdown
escapes are preserved. Common dedenting preserves relative indentation. In explicit
action blocks, ordinary `Given:` text stays Markdown; in shorthand it can become a
label boundary, so escape it or use braces.

## Execution and saved runs

Derivations and decisions are deterministic runtime operations. User and model
interactions use typed effects and accepted receipts, with atomic validation,
idempotent replies, pause/resume, cancellation, and replay. Runs pin their exact
source and transitive dependencies; editing a practice never patches an active run.
The readability extension uses the existing compiled instructions and checkpoint
schemas. See [composition](composition.md), [persistence](persistence.md), and the
[language index](README.md) for the other supported constructs and host boundaries.
