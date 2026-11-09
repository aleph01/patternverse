# Readable Pattern Language

Use `:language 1`, canonical immutable bindings, explicit braces, and local decision
arms for new practices. These are additive authoring conventions supported by the
shared Rust compiler. Older source spellings remain readable and executable.

## One binding convention

```pattern
:language 1
:output reflection

reflection = !form {
  :title "Notice one situation"
  thought = !ask {
    What thought came to mind?
  }
  notes = !ask [optional] {
    Anything else you want to remember?
  }
}
cleaned = trim(reflection.thought)
!show {
  You wrote: {{cleaned}}
}
-> end
```

Use `name = expression` for a derived value and `name = !action { ... }` for an
interaction result. This is immutable binding, never reassignment. `!show`, images,
and videos remain standalone display effects. Child calls use
`result = !use helper { :with topic }`, with attributes on their own source lines.

Inside a form, the same notation declares a field of the returned record, not an
outer variable. `reflection.thought` becomes available only when the entire form
submits. Sibling fields cannot read one another. Text fields default to required
and multiline; `[optional]` permits an empty answer. Placeholders and
`:multiline false` remain available as attributes. Duplicate or conflicting
requiredness declarations fail compilation.

Standalone text questions retain their existing empty-answer behavior; adding
`[optional]` documents that behavior. This extension does not silently change
older questions into required fields. Use a form when nonblank text is required.
An optional answer is still a submitted text value, not an inferred skip or a
fabricated default.

## Keep decisions beside their actions

```pattern
:language 1
:output note

route = !choose {
  Where would you like to begin?
  - explore: "Explore a situation"
  - leave: "Leave it here"
}
?match route {
  :case explore {
    note = !ask {
      What would you like to explore?
    }
  }
  :case leave {
    note = "Left before inquiry."
    -> end
  }
}
!show {
  Your note: {{note}}
}
-> end
```

Only the selected arm runs. Finishing its block continues immediately below the
match. `-> end` finishes the current practice or returns a flow's declared outputs.
Empty arms simply continue. Local decisions may nest up to 32 levels; they cannot
contain authored labels or jumps to another region. Do not mix local arms with
`:case value -> label` arms in the same decision.

Braces around decision arms do not introduce mutable variables or a new lexical
scope. A binding read after the decision must exist, with the same type, on every
path that reaches that read. Mutually exclusive arms may provide the same binding;
a later write to an already or possibly assigned binding is rejected. A path that
ends does not need to provide values used only by continuing paths, but it must
provide every declared practice output.

For conditions rather than exact values, use ordered rules:

```pattern
:language 1
:output suggestion

energy = !rate 0..10 {
  How much energy is available?
}
?branch {
  :when energy >= 8 {
    suggestion = "Try a focused work period."
  }
  :when energy >= 4 {
    suggestion = "Choose one small action."
  }
  :else {
    suggestion = "Make room to rest."
  }
}
-> end
```

Rules are checked in authored order. The first matching arm runs. `?branch` always
requires a final `:else`; a constant condition does not make it optional.

## Exhaustive choices

A match can omit `:else` when the compiler proves that its cases cover every variant
of a closed enum or exactly every ID offered by a static single-choice question.
Immutable aliases of a known choice retain its catalogue. When mutually exclusive
arms produce different static catalogues for the same binding, matching must cover
the union. A path with an unknown catalogue removes that proof.

Dynamic catalogues, input choices, returned child choices, text, numbers, and booleans
still require a final `:else`. Matching a choice's `.value` is a text match; match the
choice binding itself to use catalogue exhaustiveness. Cases use stable IDs, not
labels. Missing, duplicate, or invented cases cannot satisfy exhaustiveness.

## Compatibility and execution

Structured source lowers to the existing forward graph, immutable assignment checks,
effects, and replay machinery. Optional fields use the existing form contract. No
new runtime instruction or checkpoint schema is introduced. Older source compiles
with its original instruction meaning; saved runs keep exact source and dependencies.
Newly edited definitions receive new revisions and affect only newly started runs.

The editor suggests canonical bindings and local arms. Blocks expose forms and their
fields, local decisions, and nested content. Edits are source patches checked by Rust
before application; advanced content remains intact and accessible in Source.
Straight-line restrictions inside collections, loops, and refinement bodies remain;
put more complex nested procedures in an explicitly called flow.

Static choice options may use the readable bullet notation or the compatible
`:option` metadata form. Migrated definitions retain existing choice metadata where
changing it would change their external interaction contract. This convention update
does not rewrite archived practices or compatibility fixtures.

## Regression example

[The Work](../../artifacts/the-work-review/practice.pattern.md) is the full accepted
example. Its [original snapshot](../../artifacts/pattern-language-readability-review/original.pattern.md)
is retained for comparison. Core tests execute all 41 entry/answer/turnaround routes
with identical prompts, field contracts, and outputs, including pause and restore.
A separate migration test compares active catalogue definitions and executable
examples with frozen originals under twelve deterministic synthetic answer policies.
These tests make no model calls and do not evaluate clinical effectiveness.
