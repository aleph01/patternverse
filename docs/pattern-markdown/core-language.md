# M2: interactions, expressions and forward control flow

Later extension: [choices and ranking](selections.md) adds optional header parameters,
multiple selection and ordered results, with desktop chat and Preview widgets.
The [realization and functional-loop extension](realization.md) adds explicit `~`
wording and always-cancellable `?loop[max]` iteration in the core and desktop UI.

Status: executable in the portable Rust core and CLI, not connected to Mira chat.
Updated through M3: [collections](collections.md) add typed records and single-Run lifecycle controls.
M4 adds [subpatterns and executable snapshots](composition.md), using the same body primitives.
This extends the M1 subset without moving orchestration into the Host. The
[check-in example](examples/check-in.pattern.md) and its
[fixture](examples/check-in.fixture.json) exercise ask, rate, derivation, ordered
branching, branch-local result assignment and a shared review step.

## Text and rating interactions

```pattern
!ask focus {
    What would you like to focus on?
}

!rate energy -2.5..10 {
    :prefer slider
    :low "Very little"
    :high "Plenty"
    How much energy is available for {{focus}}?
}
```

Ask commits participant text, including an intentionally empty response. A rating
commits a finite number within inclusive literal bounds. Decimal and negative values
are allowed; the language does not impose integer steps. Invalid types, NaN, infinity
and out-of-range values leave the effect pending. `:prefer`, `:low` and `:high` are
presentation metadata; they cannot change the numeric contract. Unknown presentation
preferences are safe for a Host to ignore.

Action blocks may use shorthand: omit braces and let the following Markdown belong
to that action until the next action, derivation, control block, label or jump.
An empty `!ask answer` captures the next text response. Control blocks always use
explicit braces. Attributes must precede body text in both forms.

## Expressions

`= binding expression` creates an immutable derived value. Supported operands are
quoted strings with JSON escapes, finite numbers (including decimal/exponent forms),
booleans, binding references and known fields. Choice fields are `.value` and `.label`;
M3 adds typed paths through collection-produced records, not untyped record inputs.

From strongest to weakest, precedence is:

1. Parentheses, references and `count(...)`.
2. Unary minus.
3. Multiplication `*`.
4. Addition/subtraction `+` and `-`.
5. Non-chained comparisons `<`, `<=`, `>`, `>=`, `==`, `!=`.
6. `not`.
7. Short-circuit `and`.
8. Short-circuit `or`.

Arithmetic and ordered comparisons require numbers; boolean operators require
booleans. Equality requires the same type. Choice equality compares semantic IDs,
not labels; choice lists and typed lists compare corresponding items in order.
M3 record equality compares corresponding fields recursively, preserving choice-ID equality.
There is no coercion, truthiness or string concatenation. Arithmetic producing a
non-finite value rejects the transition atomically, including any just-submitted
response; no partial bindings or receipts are committed.

`count` accepts `choices` or homogeneous `list<T>` values. Typed lists can be supplied
as explicit inputs, including empty lists. Example input value for `list<text>`:

```json
{"type":"list","value":{"element_type":"text","items":[{"type":"text","value":"A"}]}}
```

Lists have no literals, indexing or mutation; M3 collections produce typed record lists.
Agent return contracts remain the original five scalar/choices contracts.
Arbitrary functions, dynamic properties, I/O, randomness and evaluation of generated
strings are not supported.

Names retain M1's ASCII letters/underscore followed by letters, digits, underscores
or hyphens. A hyphenated name is one token: write `left - right` for subtraction.
`true`, `false`, `not`, `and`, `or` and `count` are reserved binding names. As an authoring
guard, an expression is limited to 16 KiB, 16 nested parentheses and 128 operator
characters/boolean keywords outside strings. These are not production import quotas.

## Branches, matches and labels

```pattern
?branch {
    :when energy >= 8 -> high
    :when energy >= 4 -> medium
    :else -> low
}
```

Branch evaluates conditions in order and transfers to the first true arm. Match
evaluates its subject once and compares exact cases:

```pattern
?match selected {
    :case first_step -> start
    :case "take a break" -> rest
    :else -> review
}
```

For a choice subject, cases are semantic IDs (bare identifiers or quoted strings).
For text, number or boolean subjects, cases must be corresponding literals. No case
expressions, ranges, list matching or duplicate cases. Both constructs require a
single final `:else`; even a constant condition does not waive that requirement.

`label:` identifies the next instruction. Labels create no scope. `-> label` must
point strictly forward; backward/self jumps, unknown/duplicate labels, a label with
no following instruction, and a user-defined `end:` label are rejected. `-> end`
completes the Run immediately. Every reachable path must explicitly terminate;
falling off the source is an error. Content after one path's end can still be reached
from another branch.

The compiler tracks **definitely assigned** bindings (intersection at joins) and
**possibly assigned** bindings (union). A read requires definite assignment. A write
requires no possible earlier assignment on that path. Mutually exclusive paths may
bind the same result with the same type; they lower to the same binding slot. Every
declared output must exist at every reachable completion. All authored branch arms
are conservatively considered possible—no constant-folding exceptions.

Unreachable statements produce `S_UNREACHABLE` warnings with source spans and help.
They are still syntax/type checked; disconnected dead paths never satisfy a live
path's assignment/output requirements. Warnings are exposed through the compiler
API and rendered by the CLI.

## Literal Markdown and interpolation

Within action content, prefix a reserved syntax line with a backslash to display it:

```pattern
!show {
    \!ask example
    \:option example "Label"
    \-> end
    \}
    Show literal \{{unknown}}, but interpolate {{focus}}.
}
```

`\{{` is a literal opening delimiter, `\\` is a literal backslash, and other
Markdown escapes are preserved. Leading escape handling preserves relative
indentation after common dedenting. Inside explicit action blocks, ordinary text
such as `Given:` stays Markdown; in shorthand it is a label boundary, so escape it
or use braces. These are source-level escapes only: interpolated participant/AI text
is never re-parsed as Pattern source. The UI Host still owns safe Markdown rendering.

## Reproducibility and limits

Branch decisions and derived values are internal deterministic operations, not Host
effects. Effects, accepted receipts, source provenance, duplicate handling and restore
all use the existing runtime. Checkpoint replay covers each branch without repeating
accepted AI/user interactions. M2 introduced snapshot schema 2 / compiler m2-v1;
M3 used 3 / m3-v1; M4 now uses **4 / m4-v1**. Earlier development snapshots are rejected rather than
silently reinterpreted; there are no production Pattern runs to migrate yet.

M3 implements collections, record fields and single-Run pause/resume/cancel/fail.
M4 adds isolated child runs and a pure Run Manager. Compiled refinement,
durable/encrypted Host storage, editor and chat UI remain pending. The standalone `!refine` frame remains
the required basis for its later integration.
