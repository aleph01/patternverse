---
id: agentic-deliver-small-reviewable-changes
type: pattern
title: 'Deliver Small, Reviewable Changes'
summary: 'Split agent work into coherent changes with enough context and verification to assess each purpose, while preserving explicit dependencies and a working integrated state.'
status: published
tags:
  - agentic-coding
  - decomposition
  - code-review
  - integration
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on documented small-change, continuous-integration, feature-availability, and Scrum practices. All change plans, branch results, contracts, and line counts are fictional.'
---

## Purpose and problem

An agent returns an import feature in one patch: parsing, preview, saving, a validator refactor, and a new worker queue. Every piece appears related to import, yet the reviewer must reconstruct which changes are necessary, which behavior is intended, and whether the queue solves a demonstrated problem.

Deliver Small, Reviewable Changes makes each proposed change answer a coherent engineering question with inspectable evidence. Small means a manageable purpose and its implications, rather than a particular number of lines or an entire backlog item.

## Core idea

A useful review unit includes the behavior or transformation, relevant checks, necessary documentation, and enough context to understand its dependencies. Splitting production code from its tests makes both harder to assess. Adding an unused abstraction solely to make a later patch shorter can have the same effect.

Google's Small CLs guidance recommends self-contained changes, related tests, and separating substantial refactoring from behavior changes. It also recognizes that mechanical changes can be large. These are criteria for judgment, not a universal patch-size threshold. [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)

Keep the units distinct: a task delegates work; a commit records a versioned change; a review unit is what a reviewer assesses; a backlog item represents a product outcome. Their boundaries can coincide, but need not. One review may contain several coherent commits, and a dependent review may need an explicitly identified base change.

## How it works

Start with the parent acceptance requirements and propose a sequence of assessable behaviors. For each unit, name its purpose, evidence, prerequisites, and intended state after integration. Ask whether the existing product can still work if later units are delayed.

Keep necessary preparatory changes with a concrete use or explain their independent value. Separate unrelated cleanup. Make dependencies explicit in the review description and version-control structure: which base includes the prerequisite, which diff is under review, and which combined state was checked. Reassess that evidence when a dependency changes.

Preserve a working integrated state throughout the sequence. Fowler's Continuous Integration account emphasizes bringing changes together and verifying the shared code; independent branch builds do not establish that the changes coexist correctly. [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)

Partial implementation must not expose a broken user path. Prefer a useful partial capability when one exists. Otherwise keep unfinished behavior unavailable and test that intended state. Fowler describes withholding an entry point or using release flags; neither removes the need for quality checks on the integrated code. [Feature Flag](https://martinfowler.com/bliki/FeatureFlag.html)

## Worked examples

### Split preview from confirmation without losing the feature

This fictional import keeps the earlier requirements: preview row errors, make no inventory changes for an invalid file, and apply a valid file only after confirmation, all rows or none. Existing identifiers must be rejected. Inventory starts with `P100: 4`.

A combined patch could implement all of this, but here preview is useful independently and can be assessed before any write path is introduced. Two dependent review units expose that distinction:

| Unit              | Purpose and acceptance evidence                                                                                                                                          | Intended integrated state                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| U1 — Preview      | `P201,3` followed by `P202,-1` shows a row-2 quantity error; inventory stays `P100: 4`. Include validation, mapping, rendering, and relevant checks.                     | Usable read-only preview; no confirmation control or import write route.                                 |
| U2 — Confirmation | A valid file adds `P201: 3` and `P202: 0` after confirmation. Existing-SKU rejection, invalid input, and write failure preserve inventory. Include transactional checks. | Preview and confirmation work together; parent acceptance requirements still need complete verification. |

U2 depends on U1's behavior and error conventions. It must revalidate at the write boundary, using the existing transactional service rather than treating an earlier preview as permission to save. The table is a proposed evidence plan, not results from an implemented importer.

![The same import requirements appear in one combined review and in two dependent review units, U1 for read-only preview and U2 for confirmation with transactional checks. After U1 there is no import write route; U2 depends on U1.](../assets/agentic-coding/changes-import.svg 'Fictional change plan with the same feature requirements in both views. Arrows identify review dependencies and intended integration order, not completed commits, releases, or measured review savings.')

Defer background processing until representative workloads reveal a problem the synchronous design cannot meet. Retain input sizes, operating conditions, and observed limits before choosing a queue. No workload measurements are supplied here, so the plan neither requires a worker nor asserts that synchronous processing will be sufficient.

U1 can close while the parent import item remains incomplete. If preview cannot be exposed usefully on its own, keep the incomplete capability unavailable instead of presenting a broken confirmation flow. Any flag must cover the relevant callable paths, not merely hide a button.

### Two branches still share a contract

A fictional frontend and backend team agree that `POST /imports/preview` returns `errors` containing `{row: 2, code: "quantity_nonnegative"}` for the same invalid file. Row numbers exclude the header, and preview writes no inventory.

Backend change **B1** adds the endpoint and contract checks. Frontend change **F1** adds the row-error presentation. Both labels are fictional review units. Work can proceed separately, but the frontend's review depends on the agreed contract and evidence from the combined implementation.

Suppose B1's check expects `row`, while F1's local mock supplies `line`. Each branch passes its own checks. Together, the renderer reads a missing `line` property, so the row number disappears. The split isolated workspaces without preserving a shared expectation.

![An agreed preview response contains row:2. Backend B1 follows that contract, while frontend F1 uses a line:2 mock and reads line. Separate branch checks can pass, but the combined response lacks the field the renderer expects.](../assets/agentic-coding/changes-contract.svg 'Constructed contract mismatch. Solid links show the shared interface and review dependencies; branch checks are deliberately insufficient. Correct the frontend and its fixture, then verify the actual combined path before closing that review.')

Correct the mock and renderer to use `row`, then check the real endpoint-to-screen path. An additive backend change may integrate first if it preserves existing clients and satisfies applicable checks. The frontend can then be assessed against that integrated base. Alternatively, coordinate dependent reviews explicitly. Two pull requests do not become independent merely because they use different folders.

### Line count can conceal the actual decisions

Consider two hypothetical changes. A **1,200-line** mechanical rename changes an internal helper from `formatRowError` to `formatImportRowError` and updates its references. A **40-line** patch rounds fractional quantities, permits existing-SKU overwrites, and saves valid rows from an otherwise invalid file.

The rename has one intended transformation. Review its scope, unresolved references, relevant build and regression evidence, and any dynamic references that a rename tool may miss. Public error codes, wire fields, and behavior must remain unchanged. Mechanical does not mean unreviewed.

The smaller patch contains three consequential policy changes, all conflicting with the current import requirements. Return those decisions rather than approving them because the diff is short. If different behavior is later authorized, organize its changes around those explicit purposes and their acceptance cases.

![A fictional 1,200-line internal helper rename has one intended purpose and preserves behavior. A fictional 40-line patch makes three policy changes: rounding fractions, overwriting existing SKUs, and saving partial files, conflicting with current requirements.](../assets/agentic-coding/changes-purpose.svg 'Invented line counts illustrate the difference between textual size and semantic scope. They are not thresholds, benchmark observations, or predictions about review effort or defect rates.')

The comparison changes the review question from “Is this under the line limit?” to “Which decisions must be understood and verified together?” It does not establish that every rename is easy or that every short behavior change needs splitting.

## Assumptions for correctness

Acceptance requirements and prerequisites must remain visible across the split. Checks must exercise the intended behavior, and integration evidence must identify the actual combined revisions and configuration.

If a change cannot preserve a working intermediate state, redesign the sequence or keep it as one coherent unit. Artificial fragmentation is not progress.

## When to use it

Use this pattern when an agent produces patches mixing several decisions, when review stalls for lack of context, or when separate tasks conceal integration dependencies. A small single-purpose correction may already be the right unit.

## Tradeoffs and operating costs

More units create descriptions, dependency updates, repeated checks, and coordination. Keep a short parent-level map so reviewers can also assess the whole behavior. Do not demand independent releases for every preparatory change.

For Scrum teams, an Increment must be usable, work with earlier Increments, and meet the Definition of Done. A merged review unit is not automatically that Increment. Other Agile workflows can preserve the same distinction without adopting Scrum terminology. [Scrum Guide](https://scrumguides.org/scrum-guide.html)

## Common mistakes and limitations

Do not split by file type alone, detach tests from the behavior they verify, or call branch-only results integration evidence. Keep unrelated refactoring separate without hiding necessary architectural consequences.

An agent's stopping condition can be a reviewable change. Product acceptance, shared quality obligations, review completion, integration, and release remain distinct. Closing one pull request does not close the parent story or authorize activation.

## Related patterns

[[agentic-agree-on-done|Agree on Done]] matches completion claims to evidence; this article chooses assessable change boundaries. [[agentic-bound-the-task|Bound the Task]] defines delegated authority and return conditions. [[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]] provides the acceptance cases retained across the split.

## Sources and further reading

- [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) — coherent changes, tests, splitting, and mechanical edits.
- [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) — shared-code verification and unfinished work.
- [Martin Fowler: Feature Flag](https://martinfowler.com/bliki/FeatureFlag.html) — availability boundaries and flag tradeoffs.
- [The Scrum Guide](https://scrumguides.org/scrum-guide.html) — usable Increments and the Definition of Done.

All change units, payloads, failures, and counts are original teaching fixtures. No importer, workload benchmark, agent workflow, or integration pipeline was implemented or evaluated for them.
