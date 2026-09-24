# Phase 3 — typed semantic AI (language 1)

These additions use `:language 1`. They run through the same Rust compiler,
persisted runtime, desktop chat and preview as existing Patterns. They do not add
an autonomous agent, event handler, hidden conversation access, or consent model.

See the [runnable review example](examples/semantic-review.pattern.md).

## Closed categories and explicit classifiers

```pattern
:language 1
type Intent = answer | question | other
classifier intent -> Intent {
  :context prompt text
  :case answer "Answers the supplied prompt."
  :case question "Asks about the exercise or the meaning of the prompt."
  :fallback other
}
prompt = "What would you like to explore?"
message = !ask {
  {{prompt}}
}
result = message ?~ intent {
  :with prompt
}
?match result {
  :case answer -> explore
  :case question -> explain
  :case other -> clarify
}
explore:
!show {
  Thank you. We can explore that together.
}
-> end
explain:
!show {
  This question invites you to choose a topic. You can also pause or end here.
}
-> end
clarify:
!ask clarification {
  What would help you continue?
}
-> end
```

Declarations precede flow. Types contain unique, payload-free variants; a leading
pipe on multiline alternatives is allowed. `Intent.answer` is a typed literal.
Inputs can declare named enum types. Matching accepts bare or qualified variants
and must cover every variant unless a final `:else` is present. Matching is a
forward control-flow instruction, not an expression.

Classifiers take one text input, a closed enum result, descriptions for every
non-fallback variant and an explicit fallback. Context is typed and mandatory:
`:with prompt` passes that binding; `:with prompt = another_binding` renames it.
Only declared input and context are sent—no other bindings or chat history.
Participant text is separate, untrusted model data, not an instruction source.

The fallback represents semantic ambiguity, **not** network failure, invalid
JSON, cancellation or an invalid category. Those leave the pending step intact
for retry or explicit participant controls. A classifier's output is an AI
interpretation, not consent, diagnosis, acceptance, truth or clinical progress.
No output automatically operates pause, stop, renewal or refinement acceptance.

## Suggestions constrained to offered candidates

```pattern
items = [{label: "First", score: 2}, {label: "Second", score: 5}]
suggestion = items |> rank ~ {
  Order by score, highest first.
}
```

The same spelling supports `select ~` and `filter ~`. Single-line criteria also
work. `{{references}}` pass explicit data separately from the authored criteria.
These are effectful **whole binding statements**, not pure function calls or
arbitrary pipeline stages. Pure `filter(items, helper)` remains deterministic.

Every result is `{outcome: SemanticOutcome, items: list<element>}`. Match
`suggestion.outcome` against `decided` and `uncertain`. The list keeps the original
typed values; the model returns only request-local IDs, never replacement items.

| Operation | Decided result | Uncertain result |
| --- | --- | --- |
| `select ~` | Exactly one original item | Empty typed list |
| `filter ~` | Zero or more originals, in catalogue order | Empty typed list |
| `rank ~` | Every original exactly once, in suggested order | Empty typed list |

Repeated labels remain separate candidates. Invented IDs, duplicates, incomplete
rankings, wrong selection counts and nonempty uncertain results are rejected.
A decided empty filter differs from uncertainty. Empty candidate lists can be
filtered/ranked to empty, or produce an uncertain selection.

These are **AI suggestions, not participant selections**. Use `!choose` / `!rank`
for a person's decision, and `!refine` for explicitly keeping wording. Never use
the model to invent someone's priorities. Model quality is not guaranteed by a
valid type: authors should ask the participant to review consequential suggestions.

## Bind generated wording without showing or accepting it

```pattern
wording = ~ Rephrase {{original}} without changing its meaning or certainty.
reviewed = !refine[rounds=2] wording {
  :as current
  edited = !ask {
    How would you change this wording: {{current}}?
  }
  -> propose edited
}
```

Braced multiline realization works too. The accepted model receipt binds text;
it does not display it or constitute participant endorsement. Later `!show`,
`!ask` and `!refine` consume that text explicitly. Existing inline and standalone
`~` behavior is unchanged.

## Replay, limits and preview

Model requests appear in the ordinary effect ledger with pinned source and exact
input values. Accepted receipts survive pause/resume and encrypted restarts
without regenerating results. Invalid or stale replies cannot advance a Run.
Preview supports explicit mock semantic JSON and the selected local model; chat
labels results as AI interpretations/suggestions, separate from user choices.

Limits: 32 authored enums, 64 variants each, 32 classifiers, eight explicit context
fields per classifier, 2,000 UTF-8 bytes per category rule, and 128 candidates per
suggestion. Existing source, value, expression and model-output limits also apply.
Enums cannot share names with bindings; `SemanticOutcome` is reserved as a type.
Named enum annotations in pure helper signatures, payload variants, general
effect pipelines, events and first-class functions are not implemented.

## Live semantic evaluation

Ordinary tests use fixtures and never contact models. An opt-in suite exercises
the production messages and decoder against an already installed loopback Ollama
model, using synthetic data only:

```sh
MIRA_SEMANTIC_LIVE_MODEL=llama3.2:latest pnpm --filter @mira/desktop exec vitest run src/pattern-runtime/semantic.test.ts
```

It checks direct/ambiguous/negated responses, instruction injection, evidence-based
ranking/filtering, and withheld personal preferences. Runtime tests separately
check category membership, candidate identity/cardinality, uncertainty, replay
and participant controls. Passing a few synthetic cases is not clinical validation
or a guarantee for other models, languages or instructions.

On 2026-09-22, the installed `llama3.2:latest` and `phi3.5:latest` models each passed
only 3 of these 7 live checks with the current prompts. Failures included incorrect
classification, added prose instead of strict JSON, and incorrect filtering.
Earlier prompts also produced incomplete rankings. **Neither small model is
qualified for dependable semantic judgments by this evaluation.** Invalid outputs
are rejected, but a contract-valid wrong interpretation cannot be detected by the
type system. Keep consequential participant review explicit and rerun this suite
when choosing a model; do not treat implementation tests as a model-quality pass.
