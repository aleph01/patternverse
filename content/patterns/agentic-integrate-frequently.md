---
id: agentic-integrate-frequently
type: pattern
title: 'Integrate Frequently'
summary: 'Keep divergence short and verify combined changes against shared behavior so interaction failures surface while they are still understandable.'
status: published
tags:
  - agentic-coding
  - integration
  - version-control
  - collaboration
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of continuous-integration guidance, incremental change techniques, and version-control documentation. Revisions, branch lanes, and integration sequences are fictional; bounded source-snapshot reference checks are identified separately.'
---

## Purpose and problem

The frontend agent passes its checks. The backend agent passes its checks. Both update from mainline, and their patches touch different files. When the changes finally meet, the interface points at the wrong CSV row. Nothing needed a textual conflict to break.

Integrate Frequently keeps independent changes from accumulating in isolation. Combine coherent work with the shared system, verify the resulting behavior, and repair disagreements before further changes depend on them. Passing branch checks is useful evidence, but it cannot reveal a peer change those checks never encountered.

## Core idea

Shorten the interval between **independent implementation and verified shared behavior**. Updating a branch from mainline exposes changes already there. Combining it with another contributor’s work exposes their interaction. Making the verified result available on the shared mainline lets subsequent work use that result.

Fowler’s [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) distinguishes pulling mainline into a branch from returning changes to mainline, where colleagues can encounter them. A build service attached to isolated branches does not by itself accomplish that practice.

## How it works

### Keep divergence and dependency visible

Choose coherent increments that preserve a working shared state. Integrate behavior-preserving preparation before building substantial dependent work where that sequence reduces coupling. Identify shared interfaces, units, data assumptions, generated outputs, and compatibility obligations before unrelated files conceal a common dependency.

Use the team’s supported model: short-lived branches with prompt review, dependent reviews integrated in order, or direct mainline integration with appropriate gates. [Trunk-based guidance](https://trunkbaseddevelopment.com/short-lived-feature-branches/) includes review waiting time in branch lifetime. Keep queues visible and reduce work size when review blocks integration; removing review merely to increase merge frequency can remove needed judgment. A stack of unpublished dependent changes still diverges from shared mainline.

A local combined candidate or merge-queue result can reveal problems before landing. Record which source revisions and base it contains. It remains candidate evidence until the work is integrated into the shared line; updating only one contributor’s branch is not equivalent. If the target advances, reassess against the resulting candidate rather than assuming an earlier green result applies.

### Reconcile content, then verify meaning

Order changes by their dependencies and compatibility: an additive interface or preparation may land before its consumer; removing the old contract may need to wait for all consumers. For a textual conflict, inspect the common ancestor, both intended edits, and affected callers. Git’s [merge documentation](https://git-scm.com/docs/git-merge) explains these versions and conflict presentation. Choosing “ours” or “theirs” indiscriminately can discard a requirement while producing syntactically valid code.

Follow repository-specific tools and ownership rules; this repository uses GitButler. Preserve other contributors’ work and make a reconciled result inspectable. Then run relevant build, contract, and behavioral checks on that exact result. A clean content merge establishes neither matching row semantics nor compatible quantity units. Keep implementation and meaningful checks together, including checks that previously passed against misleading substitutes.

If integration breaks the shared baseline, contain the break and either make an understood correction promptly or withdraw the owned change through the team’s corrective workflow. Avoid stacking speculative repairs onto a failing mainline. Restoring source does not automatically reverse data changes or external effects.

### Separate integration from availability

A working intermediate state need not expose an unfinished feature. [Branch by Abstraction](https://trunkbaseddevelopment.com/branch-by-abstraction/) describes introducing a compatible seam and changing implementations in stages. A small extraction may suffice; larger transitions may need temporary adapters or controlled activation. Any unavailable capability must remain unavailable at the server’s callable paths as well as in the UI.

Keep integration dependencies and current evidence in existing backlog and review records. Product acceptance criteria define the outcome; the team’s Definition of Done adds shared completion obligations. An agent task can stop with a reviewable change while integration and release remain pending. A story, session, branch, commit, and pull request need not map one to one, and this approach does not require a particular Agile ceremony or releasing each intermediate version.

## Worked examples

All revision labels and branch histories are fictional. Executed experiments compose disposable source modules and reference functions. They are not actual version-control merges, CI runs, mainline integrations, or application deployments.

### Updating mainline still misses the unintegrated backend

The agreed preview contract reports one-based logical data records, excluding the header. This simple file has no multiline fields:

```csv
sku,quantity
P201,3
P202,-1
```

The error must identify **data row 2**, with code `quantity_nonnegative`. Frontend **F1** renders the returned `row` directly; its mock supplies 2. Backend **B1** instead includes the header and returns 3, which its isolated fixture expects. Both local checks pass by asserting different conventions.

Both start from **M0**. Mainline **M1** adds documentation only. Frontend **F2** incorporates M1 but still contains the old backend; its check remains green. Receiving M1 has not made unintegrated B1 visible. Candidate **I1** combines F2 and B1 and displays **Data row 3**, failing the agreed expectation. The components occupy different files, so this assembly needs no competing edits to those files.

Resolve the public contract rather than compensating secretly in the renderer: corrected backend **B2** returns data row 2, and its fixture adopts that expectation. Candidate **I2** combines F2 and B2 and displays **Data row 2** in the reference. Retain the connected check, then integrate the assessed result as shared **M2** under the team’s workflow. Mainline checks must identify M2; the reference experiment does not establish that step.

The narrower result diagnoses the semantic disagreement. Real HTTP serialization, browser presentation, quoted multiline records, and server behavior remain to be checked; physical lines are not generally equivalent to logical CSV records.

![Fictional mainline M0 advances to documentation change M1. Frontend F1 becomes F2 after receiving M1, while backend B1 remains on its peer lane. Only candidate I1 combines F2 and B1, revealing row 3 instead of required row 2; corrected B2 gives candidate I2 row 2 before shared integration M2.](../assets/agentic-coding/integrate-lanes.svg 'Arrows in the lane drawing mean parent-to-child ancestry; candidate checks below it concern composed source snapshots. Updating from M1 cannot include unintegrated B1. Labels are fictional, and no actual merge or mainline integration was performed.')

### A matching number type hides incompatible units

The quantity contract is whole **each**, from 0 through 500; CSV quantities use the same unit. New validator **V1** enforces integer, nonnegative, and maximum checks. Importer **Q1** silently converts the input to hundredths by multiplying by 100. Its isolated validator/writer substitutes use that scaled representation, so its local expectation for `3` is 300. V1’s own check accepts 3 each and rejects 3.5 each.

Feed one unchanged CSV quantity `3` through both actual reference components. Q1 produces **300 hundredths**. V1 interprets the number as **300 each**, accepts it, and the reference writer records `P201: 300` instead of `P201: 3`. No field name or number type exposes the mismatch.

Repair Q1 to pass each without scaling and align its substitutes with V1’s contract. With the same initial `P100: 4`, input 3 now adds P201: 3. A fractional contrast matters: Q1 previously transformed 3.5 into accepted 350; the repaired path rejects 3.5 with `quantity_whole`, makes zero reference writes, and retains only P100: 4.

Integrate the interface agreement, importer correction, and meaningful checks in the necessary order, then verify the combined version. If hundredths are genuinely required, decide and version that representation across consumers and storage; changing an assertion cannot authorize a unit conversion. These in-memory references establish neither database behavior nor compatibility with deployed clients.

![The same input 3 each becomes 300 hundredths in Q1, then is interpreted by V1 and the writer as 300 each. The repaired path removes scaling, validates 3 each, and records 3; a separate 3.5 contrast is rejected without writes.](../assets/agentic-coding/integrate-units.svg 'Input, each-based contract, and P100:4 baseline stay fixed. Removing the conversion changes the result from P201:300 to P201:3. The fraction check exposes a second consequence of the same scale mismatch. Results come from reference functions, not a production import or migration.')

### Integrate a preparation before its consumer grows

Preview **S0** contains inline quantity validation. A later confirmation feature needs the same policy. Keeping both efforts on a long-lived branch would postpone checking their shared seam.

Preparation **P1** extracts `validateQuantity` and makes the existing preview call it, preserving response shape, error codes, and row numbering. Before starting the dependent feature, review P1, verify it against current shared code, and integrate it. The intermediate system still has a useful preview and no confirmation capability.

Reference checks compare S0 and P1 on 0, 3, −1, 3.5, and 501. Both accept 0 and 3 and return the same respective negative, whole-number, and maximum errors for the others. A two-record case still reports the negative quantity at data row 2. This is equivalence on specified cases, not proof for every input.

Feature **K1** now starts from the integrated preparation and adds confirmation using that shared validator. Its reference accepts P201: 3 and rejects P201: 3.5 without changing baseline inventory; existing preview cases still pass. Review and integrate K1 with its own checks and the current base. No new confirmation function exists in the S0 or P1 reference snapshots.

![A fictional staged sequence starts with S0 preview, integrates preparation P1 after unchanged preview checks, then adds K1 confirmation from that shared base. Each intermediate state retains a working preview; confirmation is absent until K1 and release remains separate.](../assets/agentic-coding/integrate-preparation.svg 'The sequence is an integration plan, supported by executed module-reference checks rather than actual commits. Five quantity cases and a row-number case preserve preview behavior; K1 adds valid and invalid confirmation probes. Production routes, storage atomicity, full acceptance, and release remain unverified.')

The sequence exposes the shared validator to other work before the feature grows around a private copy. It limits the dependent patch’s scope without claiming measured time savings. A real service still needs route, authorization, persistence, and complete acceptance checks before the feature is considered done or made available.

## Assumptions for correctness

Checks must exercise shared semantics on the actual combined state and preserve a defensible expected result. Contributors need access to the current mainline and contract decisions. Multi-service deployments, migrations, and independently upgraded clients may require transitional compatibility beyond a single repository build.

## When to use it

Use this pattern when several agents produce interacting changes, review queues prolong divergence, or passing isolated suites repeatedly miss combined failures. Updating from mainline is still useful; pair it with getting coherent work back into the shared system.

## Tradeoffs and operating costs

Frequent integration needs timely review, fast useful feedback, isolated fixtures, and attention to broken shared builds. Preparatory seams and temporary adapters add maintenance and removal work. Choose checks according to risk; repeatedly running an unrelated large suite cannot compensate for a missing semantic contract check.

## Common mistakes and limitations

A clean merge, a short branch, or a green branch pipeline cannot certify compatibility. Do not weaken expectations to accept the combined output, hide incomplete server paths only with UI controls, or rewrite another contributor’s work to clear a conflict. Integration frequency alone establishes neither release readiness nor security, reliability, or complete behavioral correctness.

## Related patterns

[[agentic-deliver-small-reviewable-changes|Deliver Small, Reviewable Changes]] chooses coherent units; this draft limits their divergence and verifies their shared result.

[[agentic-coordinate-concurrent-work|Coordinate Concurrent Work]] establishes ownership, isolation, and common contracts; this draft closes the loop through ordered integration and prompt feedback.

[[agentic-verify-the-complete-behavior|Verify the Complete Behavior]] selects exercised boundaries and observations; this draft applies relevant evidence to the versions contributors actually combine.

[[agentic-keep-a-traceable-change-history|Keep a Traceable Change History]] preserves intent and version mappings; this draft determines when and how those changes meet shared code.

## Sources and further reading

- [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) — mainline integration, semantic conflicts, and verified feedback.
- [Trunk Based Development: Short-Lived Feature Branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/) — prompt integration and review waiting time; no universal branch-age rule or agent productivity claim is adopted here.
- [Git: merge](https://git-scm.com/docs/git-merge) — ancestry, combined content, and inspecting conflict versions; actual repository operations follow GitButler instructions.
- [Trunk Based Development: Branch by Abstraction](https://trunkbaseddevelopment.com/branch-by-abstraction/) — working intermediate states and compatible preparation; the small extraction here is an original teaching case.
