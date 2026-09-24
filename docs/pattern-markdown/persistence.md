# M5 — checkpoints, delivery recovery and replay

The portable core now defines a durable storage **protocol**, not an application storage
backend. Runtime and Manager transitions remain pure. `persistence` wraps those transitions
in an atomic commit boundary; the same compiler/runtime also drives the scenario harness.
Mira's desktop/PWA, existing encrypted sessions and private data are untouched.

## Commit before dispatch

`AtomicStore` supplies consistent reads and durable compare-and-swap by opaque root Run ID.
`Stored` carries a revision and encoded checkpoint. An adapter must atomically publish
the complete replacement only if the expected revision still matches; an initial create
requires absence. Never map an unvalidated Run ID directly to a filesystem path.

1. `create` starts a pinned executable and commits checkpoint revision zero.
2. `apply` validates a reply or lifecycle command through the actual Manager. Invalid
   commands do not change storage. Effective changes increment the revision once.
3. The entire new state, accepted-result history and content acknowledgement set commit
   together. Only a successful commit returns the new checkpoint for delivery.
4. The Host dispatches `checkpoint.deliverable()`, not tentative transition effects.
5. After restart, `load` checks key/revision agreement and reconstructs the saved tree
   against its pinned sources and accepted commands before returning deliverable work.

Retries and identical accepted replies do not add receipts or revisions. They still
check that the caller's checkpoint is current. A conflicting duplicate fails validation;
a stale writer fails with `Conflict` instead of overwriting another accepted result.
Store errors never return tentative effects.

`Unavailable` indicates a failed operation. `OutcomeUnknown` means a write might have
committed but its success could not be confirmed: reload before retrying or dispatching.
The recovered checkpoint determines whether that result was accepted. This also applies
to initial creation; do not blindly replace an existing root after an uncertain create.

## Content and pending interactions

The delivery queue contains committed, unacknowledged `Show` effects in emission order,
followed by the current blocking effect only when its owning Run is waiting. Accepted
agent generations are not requeued. Paused or terminal Runs do not enqueue stale AI work.
Already committed passive content remains recoverable even after pause/cancel/fail.

For content, the Host must durably **upsert by effect ID**, then call
`acknowledge_content`. If it stops between those operations, the same ID is delivered again
and the upsert avoids a duplicate chat entry. Only known content IDs may be acknowledged;
blocking interactions are acknowledged through validated fulfillment, not this API.

This is **at-least-once delivery**, not exactly-once external inference. An interruption
after a model responds but before its result commits can require retrying the same effect
ID. Provider/Host idempotency is needed to avoid duplicate external work in that window.
Revision checks prevent lost updates; they do not provide dispatch leases or coordinate
multiple concurrent consumers. The Host must serialize dispatch/lifecycle decisions and
handle cancellation of already-running requests.

## Ledger, replay and traces

`RunManager::ledger()` iterates accepted external receipts in execution order, tagged
with their Run IDs. Lifecycle changes, retries and rejected/duplicate submissions do not
become ledger results. Child results remain scoped to their Runs.

`manager::replay` reconstructs the exact state and semantic traces using ordinary
transitions and recorded results, without network or UI calls. Its `recorded_effects`
are historical evidence: **never dispatch them**. Only a committed checkpoint's current
delivery queue is actionable. Trace snapshots are diagnostic output, not the source of
truth or executable control flow.

This is not a full event-sourcing platform. Checkpoints retain explicit current state,
the Manager's existing accepted results/effective lifecycle commands for validation, and
acknowledged content IDs. The content queue is derived rather than separately serialized.
Cancel/fail retain accepted values; they are lifecycle operations, not data deletion.

## Format and privacy boundaries

Checkpoint schema is **1**. Run schema remains **4 / compiler m4-v1**; executable/Manager
schemas remain **1**. Saved revisions must equal effective Manager commands plus unique
content acknowledgements. Unknown checkpoint fields, unknown acknowledged IDs, malformed
state, wrong keys and mismatched envelope revisions are rejected. Earlier development
Run schemas are not migrated.

Use `Checkpoint::decode` at the byte boundary: it rejects encoded checkpoints over
16 MiB before decoding. Direct serde deserialization is not the size-limited entry point.
This guard is not a complete CPU/memory quota; adapters must also bound allocation while
reading. Replay validation proves consistency, not authenticity or safe untrusted import.

Sources, prompts, inputs, receipts and traces may contain sensitive data. Production
adapters must encrypt/authenticate checkpoints within Mira's existing privacy boundary,
avoid sensitive logs, and honor its retention/deletion policy. That Host adapter is now
delivered for bundled desktop previews in [M6](mira-host.md). `MemoryStore` is fixture-only
and neither durable nor encrypted. The plaintext
file store under `tests/support` is test-only; it never accesses app storage.

## Scenarios and verification

`pattern scenario-bundle BUNDLE.json SCENARIO.json` runs the actual persistence layer with
the same Manager and an in-memory store. Scenarios describe fixture actions, not a second
Pattern language: typed replies, rejected replies, repeated replies, retries, root/pending
lifecycle commands, restarts, content acknowledgements and status/ledger expectations.
See [project review scenario](examples/project-review.scenario.json). Its final JSON
report includes the validated checkpoint and replayed traces.

The M5 suite adds 13 persistence tests, four property tests (64 generated cases each by
default) and two scenario tests. It covers duplicate results, stale writers, atomic saves,
uncertain commit outcomes, acknowledgements, corruption, recovery, pause/cancel/fail and
CLI/scenario parity. Generated cases exercise source spans, typed expressions and nested
child/collection restart equivalence to uninterrupted execution. A reviewed `insta`
snapshot captures normalized semantic traces, without synthetic fixture text or prompts.

The file fixture uses a per-root lock, a same-directory temporary file, file sync, atomic
rename and directory sync. Real child processes exit immediately before publication and
after commit; reopening recovers a whole old or new checkpoint. Concurrent writers prove
the revision check is serialized. These tests demonstrate process-exit recovery on the
tested filesystem, not universal hardware power-loss guarantees or a production backend.

M6's thin Mira Host bridge and encrypted storage adapter are now delivered for bundled
desktop previews. M7 adds [session-attached inline rendering](inline-chat.md), with the
core checkpoint and projected replies inside the same encrypted session publication.
Compiled `!refine`, library authoring and representative migrations
remain separate pending work.
