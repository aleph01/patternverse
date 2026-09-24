# Pattern Markdown v1 extension: `!refine`

Status: implemented in Phase 1, 2026-09-22: source parsing, compilation, replay-validated runtime, CLI, desktop chat and preview. The examples are executable language examples, not installed or clinically validated techniques. See the [current language index](README.md).

## Purpose and boundary

`!refine` progressively revises one candidate through participant-controlled rounds. Unlike `!collect`, each round explicitly receives the most recent candidate. The participant can accept the initial version, request revision, or finish without acceptance. No forced first revision, model-controlled completion or hidden Host loop.

This supplies the refinement mechanism. It does not turn ordinary modality selection into Pattern control flow, prove clinical equivalence, or perform bulk migration.

## Syntax

```pattern
:language 1
:input initial_statement text
:output statement

!refine[rounds=4, renewable] statement = initial_statement {
    :as current

    !ask correction {
        What would you change in this wording?

        > {{current}}
    }

    !agent revised {
        :returns text

        Revise the current wording only as requested.
        Current wording: {{current}}
        Requested correction: {{correction}}
        Return only the revised wording.
    }
    -> propose revised
}

-> end
```

The Runtime reviews the initial candidate **before** running the body. The body runs only after the participant requests a revision. It gathers a correction, computes the next candidate, and returns to review. This is not an arbitrary loop or a callable recursive function.

### Parameters and compatibility attributes

The compact header specifies the initial expression, required positive `rounds`,
and optional `renewable` (default false). `renewable=false` is also accepted.
The final `-> propose text_expression` is required and returns only a candidate,
never acceptance. For compatibility with the original design fixtures, the older
colon attributes below remain accepted. Do not combine `:next` and `-> propose`,
or repeat a header parameter as a colon attribute.

| Attribute | Rule |
| --- | --- |
| `:initial expression` | Required once. Evaluated once at entry in the enclosing scope. Initially must have type `text`. |
| `:as name` | Required once. Read-only iteration binding for the current candidate; must not shadow an enclosing binding. |
| `:next expression` | Required once. Evaluated after the body completes successfully in that iteration's scope; must have the same type as initial. |
| `:rounds N` | Required once. Positive integer literal, at most 2^32−1. Budget of completed revisions before a checkpoint; not a token/retry limit. Hosts may reject an excessive budget before launch, never silently change it. |
| `:renewable true/false` | Optional once; default false. True permits explicit participant authorization of another N revisions when the budget is exhausted. |

Attributes precede body statements. Unknown attributes, duplicates, missing required attributes and wrongly typed values are diagnostics, not ignored hints. No `:until` expression or model-generated acceptance condition is included: acceptance belongs to the participant.

Text is the initial supported candidate type because both audited examples need wording refinement. Do not introduce arbitrary structured AI results, record constructors or general accumulators speculatively. If a future real migration needs a structured candidate, extend the existing type system and preserve invariant candidate type per block; do not stringify records to bypass typing.

## Scope and compiler checks

- One new refinement-iteration scope. Ordinary braces still do not create scopes.
- Body may read enclosing immutable bindings plus its `:as` candidate. It does not receive ambient conversation or previous iteration locals.
- Fresh body bindings each round. `correction` and `revised` in two rounds are different binding instances, not mutable variables.
- `:next` must be definitely bound and text-valued on every successful body completion path. The outer result name is unavailable until the block completes.
- No rebinding the candidate alias, shadowing outer names, assigning outer variables, escaping jumps, backward jumps, recursive dependencies or nested repetition in the same Run's refinement body.
- Initially allow straight-line ask/choose/rate/show/agent/derivation and `!use`. More complex finite branching can live in an explicitly invoked child Pattern with declared inputs/outputs. Child recursion remains forbidden.
- A child with its own repetition has isolated Run state; parent cancellation/pause propagates. Only declared child outputs are available to `:next`.
- The compiler lowers refinement to a dedicated frame instruction, not an authored backward label jump. Source spans remain diagnostic provenance; node identity is independent of line numbers.
- The validator should distinguish parsed attributes from a validated `RefineText` node with mandatory initial/alias/next/budget fields, not unrelated optional properties.

## Runtime transition rules

1. Evaluate initial once, store candidate version 0, and request participant review.
2. **Accept** completes the block with `accepted` and the current candidate. It can happen before any revisions.
3. **Revise** starts a fresh body with the current candidate while budget remains.
4. The body executes through the ordinary Pattern Runtime. Agent requests use the normal explicit effect contracts; the refinement frame does not call a model.
5. After successful body completion and type/contract validation, atomically commit `:next` as a new candidate version, increment completed rounds and decrement the budget. Then review the new candidate.
6. At zero remaining budget, do not start another body automatically and do not call the candidate accepted. Review still offers Accept and Finish. If renewable, it also offers **Continue**.
7. Continue is a participant decision granting exactly N further revisions and starting the next body with the current candidate. It is not a new Run, new source snapshot or reset to initial. It is unavailable before a checkpoint or when renewable=false.
8. **Finish** completes the block without acceptance. Its outcome is `unresolved`, except at an exhausted nonrenewable limit, where it is `limit_reached`.

| Review state | Available semantic choices |
| --- | --- |
| Initial / budget remaining | `accept`, `revise`, `finish` |
| Budget exhausted, renewable | `accept`, `continue`, `finish` |
| Budget exhausted, not renewable | `accept`, `finish` |

All of these choices have stable values, not position-based identity. Generic labels should say “Keep this version,” “Revise,” “Continue revising,” and “Finish without accepting.” They must not imply a breakthrough, a true belief or clinical success.

Every revision is participant-gated, even inside an authorized batch. Renewal allows repeated batches, not permission for an AI to run N revisions without review. A finite grant does not bound model time, retries or effect count; those remain separate Host limits. Finite acyclic body execution must also satisfy the ordinary compiler checks.

### Participant authority

Review uses a dedicated typed `interaction.refine` effect containing the candidate,
available decisions and checkpoint status. This deliberately replaces the initial
design's generic-choice wire proposal: a review also supports direct text edits,
which are not choices. Hosts return `reviewed` with `Accept`, `Revise`, `Continue`
or `Finish`, or `edited` with new text. Other fulfillment types are rejected.

Direct editing is available at every review, including an exhausted budget. It
creates a new review identity and never accepts the text automatically. Empty/blank
edits and edits over 32,000 UTF-8 bytes are rejected. Direct edits do not run the
body, decrement its budget or increment `.rounds`; that counter counts completed
body revisions. The desktop offers Keep this wording, Describe a change,
Continue refining at renewable checkpoints, Finish without keeping it, and Edit
wording myself. Pause/end remain separate exercise controls.

An AI classifier may propose an interpretation of natural-language feedback, but may not fulfill review as the participant. Ambiguous “okay” must not silently become acceptance; the interface must obtain participant confirmation. Likewise AI cannot grant a renewal. The Host is trusted to report the origin honestly: a serialized actor field is a protocol guard, not an authentication system.

An authored empty `!ask` can capture text after a conversational agent question. The initial version keeps review and correction as separate interactions. A future combined review-and-edit UI must preserve the two logical fulfillments and their identities; it must not secretly reinterpret an answer as both consent and a correction.

### Results and exit meanings

The outer name binds a generated record on successful block completion:

```text
statement.value    text
statement.outcome  choice: accepted | unresolved | limit_reached
statement.rounds   number (completed revisions; initial acceptance is 0)
```

`value` is the latest candidate, not automatically an endorsed belief. Authors must inspect `outcome` before claiming acceptance or using the value as an accepted formulation. The choice label is presentation; matching uses its stable value, as for ordinary choices. Only explicitly declared Pattern outputs leave the Run.

Finishing without acceptance is a normal result and may lead to authored forward branches. **Cancelling the Run is different**: terminal cancellation, no successful refinement result, active descendants cancelled. A Host failure is likewise distinct. Pause is nonterminal and preserves the current interaction. Refusing an exercise or withdrawing consent must never be treated as invalid input to retry indefinitely.

### Budget policy and the original no-loop rule

This extension deliberately changes “all Runs have a fixed total repetition bound.” A renewable refinement can last indefinitely **only through repeated explicit participant decisions**. Between decisions, execution remains bounded by a finite acyclic body. Nonrenewable refinement still has a fixed revision bound.

No arbitrary authored loops/backward jumps, generic mutation, executable generated text or implicit history access are introduced. Host safety/resource policy can pause or cancel at any time; it cannot silently renew, accept or forge successful completion.

## Persistence, atomicity and replay

The frame must persist candidate version, completed rounds, remaining budget, pinned node/body identity, local iteration state, review/body phase, pending operation ID and lifecycle status. IDs must remain unique across renewals and must not depend on line number or current time.

- Pending body locals and accepted agent values live in the ordinary body frame. Never rerun accepted generation when retrying/resuming refinement.
- Pause during body sends a suspend action to that existing body; resume addresses the same invocation. Pause during review re-exposes the same review effect on resume.
- Results arriving while paused are rejected, not automatically buffered. Already accepted values remain durable; pending, unaccepted generation can be retried explicitly after resume without changing its effect identity.
- Invalid type, wrong ID, wrong phase, unauthorized choice or conflicting duplicate leaves state unchanged.
- Same accepted result delivered twice is a no-op with no duplicate effects or advancement. Same ID with different content is a protocol error.
- Persist frame/body state and accepted-effect ledger atomically before publishing advancement. Debug traces are separate and cannot substitute for this ledger.
- New source edits never change the pinned body or budget of an active Run. Review choices cannot inject Pattern source.
- Retention of candidate history is Host privacy policy, but do not discard ledger data needed by retained replayable Runs. Do not put hidden reasoning in traces.

## Implementation and verification

`crates/pattern-core/src/refine.rs` implements the pure text-refinement frame.
`compiler/refinement.rs` validates and lowers the body; `runtime/refinement.rs`
adapts it to ordinary effects and isolated child calls. `ExecuteBody` is not an
LLM callback. `BodyCompleted` follows a compiled, type-checked `-> propose`.

The Run runtime maps outcomes to typed choice values, records source/node
provenance and checks saved frames by replay. The desktop's existing encrypted
Run Manager store persists these states. Preview uses the same runtime; there is
no second JavaScript refinement engine. Host authority remains a trust boundary:
the wire protocol cannot cryptographically prove that a person clicked a button.

Run tests with:

```sh
cargo test --manifest-path crates/pattern-core/Cargo.toml --offline
```

Contract and runtime tests cover latest-candidate transfer, direct edits, initial
acceptance, renewal, exhaustion, unfinished results, authority, invalid replies,
duplicates, pause/restore/resume, cancellation, child calls and executable examples.
They do not evaluate model or clinical quality.

## Remaining boundaries

Broad therapy migration, clinical evaluation and PWA integration remain separate
work. No legacy technique implementation is removed. General structured candidates,
same-Run nested refinement, classifiers and event handlers are not added here.
