# M4: subpatterns and exact executable snapshots

Status: implemented in the portable Rust core and CLI, not connected to Mira chat or
production storage. The [project review](examples/project-review.pattern.md) calls
[a small-step child](examples/project-step.pattern.md); their
[source bundle](examples/project-review.bundle.json) and
[fixture](examples/project-review.fixture.json) run without a model or private data.
Tests ensure the bundle contains the exact canonical `.pattern.md` source bytes.

## Explicit composition

```pattern
!use project.step as plan {
    :with topic
}
!show {
    First step: {{plan.next_step}}
}
```

`!use pattern.name as alias` invokes an isolated child Run. Names are dot-separated
identifiers resolved from an explicitly supplied local library. This is not source
inclusion, network lookup, a filesystem path, dynamic invocation or a plugin call.
An action may use explicit braces or shorthand; its only content is repeated `:with`.
No Markdown or nested source belongs inside `!use`.

`:with topic` supplies the parent's `topic` binding to the child's declared `topic`
input. `:with topic = selected.label` renames/maps a typed expression. Literal and
pure derived expressions are allowed; the type must exactly match the child input.
Supply every input exactly once. Missing, extra, duplicate or mistyped inputs are
compile errors. Nothing is inferred from chat, root state or another child's internals.
Existing scalar/choices/list input declarations remain supported; arbitrary record
input schemas and record literals are not introduced by M4.

The parent waits until the child completes. Then `alias` is assigned a record of
**only the child's declared outputs**. Known field paths work in templates,
expressions, branches and subsequent `:with` mappings. An output-free child returns
an empty record. The child may have internal bindings, but parent Pattern source
cannot reference them. This is a language scope boundary, not secrecy from the trusted
Host that stores and inspects the run tree.

An alias follows the ordinary immutable/definite-assignment rules. Branch paths can
produce the same alias only with identical output schemas. A call inside `!collect`
creates a fresh child Run for each record, and its output record becomes one local
field. That child may contain its own collection: it is a different Run with separate
bindings, frame, effect sequence and ledger. Parent-local state is never ambient input.

## Compile once, pin the dependency closure

`ExecutableSnapshot::build(SourceBundle)` takes a root name plus a map of local names
to exact source strings. It parses authored calls, resolves and type-checks dependencies
bottom-up, and rejects missing dependencies and cycles before execution. This includes
calls in collections and unselected/unreachable branches. Unreferenced library entries
are excluded, so an unrelated invalid draft cannot change an executable.

Each lowered call references the exact compiled child revision, not a symbolic lookup
at execution time. Compiled identity hashes the compiler version, exact source and
resolved dependency interfaces/revisions; changes to a grandchild change ancestor
identities. The executable snapshot also pins root name, exact root source, all transitive
dependency sources and compiled artifacts. Revision here means content-derived identity,
not a mutable library version label. Shared dependencies are compiled once; each call
still creates a separate Run.

Editing a library item after launch affects only newly built snapshots. Existing runs
continue with the old immutable snapshot, even after serialization/restoration. No active
Run accepts source patches. Snapshot restoration rebuilds the complete closure and
compares it with the saved artifacts. The initial resolver bounds are 64 dependency
levels and 1,024 referenced Pattern names. Recursion remains prohibited.

## Runtime versus Run Manager

The single-Run runtime emits `ManagerAction::StartChild` at a call site and retains
a pending child call instead of emitting a Host effect. The Run Manager consumes that
action, starts the exact dependency with evaluated inputs, records the parent link,
and routes external effects from the child to the Host. Child completion is an internal
typed transition, **not a public Host fulfillment**. The parent cannot accept a forged
UI response in place of child outputs.

The same primitive runtime executes every root and child. The Manager handles only
creation, routing, lifecycle propagation and completion; it is not another Pattern
interpreter. Nonblocking child content is delivered in order before subsequent parent
effects. Completed children are retained for audit/replay. Effects carry their own Run
ID, compiled revision, node/span and collection provenance. Traces are qualified by Run
ID, with child-requested and child-completed entries linking the invocation.

One `RunManager` owns one root tree. A Host can hold independent instances for unrelated
roots; each has no access to the others. Hosts must assign unique root Run IDs in their
storage namespace. Execution is sequential—there is no concurrent-child syntax. Created
and running phases are synchronous; stable exposed states remain waiting, paused,
completed, cancelled or failed. A pending child distinguishes a parent's wait from a
leaf's pending external interaction.

## Pause, completion, cancellation and failure

- Pausing a parent pauses every active descendant. Current values and pending identities
  are retained. Resuming the subtree re-emits only the pending leaf effect, not accepted
  generations or completed calls. The Host must deduplicate outstanding work by effect ID.
- Pausing only a child leaves its parent waiting for that child. Resuming the parent also
  resumes paused descendants. A child cannot resume while an ancestor is paused.
- Completing a child passes only its declared output record to the waiting parent and
  continues parent execution. This may immediately start another child or finish the root.
- Cancelling an active child propagates cancellation to ancestors and active descendants;
  cancelling a parent also cancels its active descendants. Failure propagates analogously
  and remains distinct from cancellation. Completed siblings are not rewritten.
- Cancelled/failed parents do not receive partial child outputs or pretend to complete.
  Late, unaccepted replies cannot advance the tree. Accepted duplicates remain no-ops;
  conflicting duplicates are rejected, even after a parent has advanced to another call.

The manager transition is atomic in memory: invalid replies, expression failures and
failed child launches return neither new state nor effects. A parent postprocessing error
therefore also rolls back that transition's tentative child completion and accepted reply.
Operational impossibility is still a Host decision: the Host may issue `Fail`; errors do
not silently synthesize a successful child result or a language-level exception branch.
Cancel/fail retain prior receipts and completed children; they are not data-deletion APIs.

Default Manager limits are 1,000 total Runs per tree (including completed ones/root) and
32 active levels (root is level 1). The existing 1,000-record per-collection cap applies
inside each Run. Limits can be supplied explicitly and reject excess work instead of
truncating it. These are development guardrails, not a comprehensive CPU/memory/import
budget. A Host must explicitly fail/cancel or resolve its policy when a limit is reached.

## Restore and verification boundary

Single-Run schema is now **4**, compiler **m4-v1**; executable snapshots and Run Managers
use their initial schema **1**. Earlier development Run schemas are rejected. No deployed
Pattern state exists to migrate and there is no snapshot migration implementation yet.

A Run retains the chronological accepted external results and internal child completions
needed to validate its state. The Manager retains accepted external results and effective
lifecycle commands and reconstructs the tree against the pinned snapshot. Retries, no-op
duplicates and debug traces are not its input journal. Restore invokes the same transitions
without calling AI or delivering effects. It verifies links, inputs, exported results,
pending identities and the complete resulting tree. A coherent standalone child Run with
different inputs is still rejected when it does not match the parent's actual invocation.

The Manager is the composed validation boundary; a standalone Run can validate a recorded
child result's type but cannot prove execution of that child without the snapshot/tree.
State consistency is not cryptographic authenticity, encryption or an untrusted-import
boundary. Saved sources/inputs/receipts can contain sensitive data. M5 now adds the
[atomic checkpoint and delivery-recovery protocol](persistence.md), including crash-window
tests. The production encrypted storage adapter and migrations remain later work.
Filesystem save/load is not yet wired to Mira.

## Harness and acceptance

`pattern check-bundle BUNDLE.json` builds/validates the closure. `pattern simulate-bundle
BUNDLE.json FIXTURE.json` runs the actual Manager with the same typed fixture responses
as single-Run simulation. The bundle is an explicit transport of source texts, not a second
workflow format. `pattern check/run/simulate SOURCE` remain the single-source harness;
unresolved `!use` reports that an executable snapshot is required.

Twenty-five composition tests cover static contracts, isolation, exact revisions,
transitive edits, cycles/missing dependencies, shared children, record-local child runs,
branch joins, pause/restore, cancellation/failure from every active level, terminal
duplicates, wrong routing, atomic rollback, resource limits, snapshot/tree inconsistency,
Unicode/partial headers and CLI/simulation parity. Standalone patterns produce identical
effects and root state through the Manager and the single-Run runtime.

M4's portable-core gate is satisfied. M5 persistence/replay/ledger hardening,
restart scenarios, trace coverage and invariant/property tests are delivered separately;
Mira Host integration follows in M6.
Compiled `!refine` remains pending and must reuse its existing tested semantic frame.
No website, desktop behavior, user library migration or real-model evaluation is included.
