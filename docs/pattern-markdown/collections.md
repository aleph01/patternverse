# M3: bounded collections and resumable record scopes

Status: executable in the portable Rust core and CLI, not connected to Mira chat.
Updated through M4: [child Patterns](composition.md) may be called inside a record.
The [project ideas example](examples/ideas.pattern.md) and its
[fixture](examples/ideas.fixture.json) exercise open collection, continuation,
record fields and a mapped follow-up. These are synthetic fixtures, not migrated
therapy techniques or real-model evaluations.

## Open collection

```pattern
!collect ideas {
    :min 1
    :max 3

    !ask idea {
        What is one small idea?
    }
    !rate interest 0..10 {
        How interested are you in {{idea}}?
    }
}
```

`:max` is required; `:min` defaults to 1. Both are nonnegative integer literals that
fit in an unsigned 32-bit integer, and minimum must not exceed maximum. Before the
minimum, the next record starts automatically. After minimum and before maximum,
the runtime emits `interaction.choose` with semantic choices `add` and `finish`.
`collection_continuation` metadata carries the collection node ID, completed count,
minimum and maximum; the Host may change presentation but must not own repetition.
At maximum, collection completes without another question.

`:min 0` asks whether to start the first record. Finishing there yields a correctly
typed empty list. `:min 0` with `:max 0` completes immediately without body effects;
omitting minimum with maximum zero is invalid because the default minimum is 1.
There is no way to finish halfway through a record. Pause, cancellation and failure
are lifecycle controls, not a successful early record completion.

## Mapped collection

```pattern
!collect plans {
    :from ideas
    :as item

    = idea item.idea
    !ask next_step {
        What would be a first step for {{item.idea}}?
    }
}
```

`:from` must evaluate to a typed list or `choices`; `:as` is required. The source is
evaluated once on entry, and its items are processed once each in their original
order, including repeated list items. The alias is read-only. An empty source
produces a typed empty output list without executing the body. There is no continuation
question and no `:min` or `:max` in mapped mode.

Both modes bind a homogeneous list of records. Every binding introduced in the body
is a record field; the mapped alias and enclosing bindings are excluded unless
explicitly copied with a derivation. For example, `= original item` copies the item
as a field, which can itself be a record. A body containing only `!show` is valid
and produces empty records. A completely empty body is rejected.

## Scope and typing

- Root bindings are readable, not writable, inside each record.
- A fresh record scope is created for each iteration. Neither previous-record locals
  nor an unfinished collection's own result are accessible.
- No shadowing of the source alias or any possibly assigned enclosing binding.
- Record-local names do not escape; only the collection's completed list does.
- Known record fields work in expressions and templates, including nested paths such
  as `item.original.idea`. Choice paths `.value`/`.label` remain supported.
- Dynamic `!choose :from item.options` accepts a choices-valued field expression.
- Lists and records use structural equality; nested choices compare semantic IDs.
- Branches outside collections may produce the same binding only when record schemas
  match exactly, and the usual definite/single-assignment rules still apply.

Collections require explicit braces. Body actions may use braces or shorthand; the
collection's closing brace also closes a final shorthand action. Supported body
statements are the existing primitive actions, pure derivations and M4 `!use`. There are no
labels, branches, jumps, nested collections in the same Run, record literals, list
indexing, mutation or generated-code evaluation. Put Markdown inside an action such
as `!show`. Child Patterns have their own isolated Run scopes and may collect there.

## Transactional state and lifecycle

A collection frame stores its source items (mapped mode), fully completed records,
current record locals and body cursor. Body instructions execute through the **same
runtime driver** as root instructions; the frame only schedules repetition. A record
is appended only when every body statement has finished. The collection binding is
assigned at collection completion; declared Run outputs are projected at Run completion.
Invalid replies or expression failures roll back the whole transition, including its
receipt and any tentative record completion. Already completed earlier records remain
unchanged in the original state.

`Event::Pause` retains the current cursor, locals, completed records and pending effect.
`Event::Resume` re-emits that exact pending effect ID, never a previously accepted
generation. A retry also keeps the pending ID. The Host must deduplicate external
work by effect ID; pause does not itself stop a network request. Fresh replies while
paused are rejected. Exact accepted duplicates remain no-ops, including across record
boundaries; conflicting duplicates remain errors.

`Event::Cancel` and `Event::Fail` clear the active frame and pending interaction and
produce no successful Run outputs. These terminal states cannot resume; a late,
unaccepted reply cannot advance them. Receipts remain in the ledger for replay and
audit, so cancellation is **not deletion of sensitive data**. The lifecycle events
are an initial single-Run API, not the future multi-Run Manager or durable Host queue.

Effects include collection provenance: collection node ID and a zero-based record
index for body effects, or no record index for continuation. Repeated body nodes keep
their node IDs; each new effect receives a distinct sequence identity. Traces include
collection/record start and completion plus pause/resume/cancel/fail.

## Bounds and snapshots

The default Host safety ceiling is 1,000 records per collection. `start_with_limits`
lets an embedding Host choose an explicit alternative. An open maximum above this
ceiling rejects launch (including authored collections on unselected branches);
a mapped source exceeding it rejects entry. Counts are never silently truncated.
This is a per-collection cap, not a total execution/memory quota or protection against
untrusted imports. Production limits, scheduling and cancellation of external work
remain Host integration work.

M3 introduced development snapshot schema 3 / compiler m3-v1; M4 uses **4 / m4-v1**.
Saving the
entire Run preserves the frame, limits, ledger and pending effect. Restore recompiles
the exact source and replays accepted results through the same runtime, then compares
the reconstructed state and reapplies the saved lifecycle status. It makes no AI
calls and delivers no external effects. It rejects inconsistent locals, source items,
cursor, records and pending metadata. Lifecycle event history is not yet persisted
as a separate journal; current status is preserved.

M1–M3 development snapshots are rejected by M4, not migrated. Replay validation is not
authentication or encryption: a consistently rewritten source/input/ledger or changed
Host limit is not a trusted-import boundary. Saved state contains participant data;
production storage must provide the existing privacy boundary and atomic durability.

## Verification and remaining work

Twenty collection tests cover limits, zero/empty sources, transactional rollback,
fresh scopes, branch joins, typed/nested fields, mapped ordering, continuation,
pause/restore, duplicate replies, cancel/fail, inconsistent snapshots, safe data
interpolation, partial/Unicode syntax and fixture/CLI simulation. The existing M1,
M2 and standalone refinement tests remain passing.

M3 is complete. M4 has added `!use`, explicit child inputs,
declared child outputs, dependency resolution and isolated child lifecycles. Compiled
`!refine` integration, durable Host persistence and Mira UI remain pending. Independent
records do not replace cumulative refinement; its existing tested semantic frame must
be reused when compiled bodies are connected.
