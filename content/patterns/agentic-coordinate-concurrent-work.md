---
id: agentic-coordinate-concurrent-work
type: pattern
title: 'Coordinate Concurrent Work'
summary: 'Coordinate parallel implementation through explicit edit boundaries, versioned contracts, isolated working changes, and a deliberate integration sequence with combined evidence.'
status: published
tags:
  - agentic-coding
  - concurrency
  - collaboration
  - integration
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on official Git documentation, consumer/provider contract testing, and continuous-integration guidance. All working areas, revisions, schema proposals, and integration plans are fictional.'
---

## Purpose and problem

Two agents finish their tasks. One changes how products are identified; the other adds inventory references. They edit different files, and neither patch contains a textual conflict. Together, the changes disagree about what identifies a product.

Coordinate Concurrent Work makes parallel work explicit at the places where it can interact: working files, shared contracts, data assumptions, and integration. The aim is useful independence during implementation, followed by deliberate verification of the combined system.

## Core idea

Concurrency needs more than separate task names:

| Concern                    | Coordination question                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Edit boundaries            | Which files, generated outputs, and shared resources may each contributor change?     |
| Contract                   | Which interface or data assumptions must remain shared?                               |
| Isolation                  | Can one contributor's unfinished changes affect another's working area or test state? |
| Dependency                 | What must be agreed or integrated before another change can close?                    |
| Integration responsibility | Who assembles the changes, resolves disagreements, and retains combined evidence?     |

A branch and a workspace solve different problems. Git describes a branch as a movable reference to a commit. Naming two branches does not create two independent directories of editable files. Git worktrees provide multiple working trees for one repository. They do not, by themselves, separate databases, services, ports, or other external resources. [Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell) · [git-worktree](https://git-scm.com/docs/git-worktree)

## How it works

Before delegating, map dependencies and likely contention. Include schema meaning, lockfiles, generated types, fixtures, and runtime state, not only source folders. Choose work with a useful independent result. If both tasks must repeatedly change the same abstraction, reconsider parallel execution.

Give each contributor an explicit edit area, shared references, expected evidence, and return conditions. Assign responsibility for changes to common artifacts such as a contract or root lockfile. A contributor may report a needed change outside its area without implementing it unilaterally.

Use an appropriate workspace arrangement. Separate directories can isolate unfinished files; shared test infrastructure may need separate data or serialized access. If a shared checkout is intentional, coordinate access rather than assuming branch labels isolate writes. Do not overwrite, discard, or rewrite another contributor's unreviewed work to simplify integration.

Agree the contract and intended integration order, then retain evidence against exact combined revisions. Text-conflict resolution only decides how file contents combine. Fowler's Continuous Integration account distinguishes these conflicts from semantic conflicts that require build and behavior checks. [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)

## Worked examples

### Two working areas, one preview contract

In this fictional case, frontend and backend agents implement CSV preview. The input has `sku,quantity`, followed by `P201,3` and `P202,-1`. Before implementation, they agree versioned contract **ERR-1**: `POST /imports/preview` returns `errors` containing `{row: 2, code: "quantity_nonnegative"}`. Data rows start at one, excluding the header. Preview must write no inventory.

Both start from fictional **BASE-H**. Working area **W-F** contains frontend change **F1**; **W-B** contains backend change **B1**. Their fixtures use separate synthetic state. The frontend owns rendering and consumer checks; the backend owns the endpoint and provider checks. Neither independently edits ERR-1 or shared generated definitions. A required contract change returns to their shared task discussion.

Consumer/provider testing can verify both sides against the same interaction. Pact documents checking that a consumer handles the expected response and verifying that the provider produces it. Such checks do not replace all application behavior or environment checks. [How Pact works](https://docs.pact.io/getting_started/how_pact_works)

![Versioned contract ERR-1 supplies the same row:2 error to isolated frontend area W-F and backend area W-B. Their changes F1 and B1 converge into a planned integration sequence and a real endpoint-to-screen check.](../assets/agentic-coding/concurrent-contract.svg 'Fictional working areas and revision labels. Arrows identify contract and integration dependencies, not measured execution times. File isolation and contract checks do not establish complete application compatibility.')

The assigned integrator first checks whether additive B1 can integrate while preserving existing clients, then combines F1 against that base. Each handoff identifies its base, changes, working-tree remainder, check results, and unresolved assumptions. The integrator verifies the actual request-to-screen path: row 2 is displayed, `P100: 4` remains unchanged, and existing behavior still works. If B1 is not independently compatible, revise the sequence rather than forcing that order.

This is a plan for evidence, not a report of executed agent work. Even after both local tasks close, the parent feature and applicable shared quality obligations require their own completion assessment. Integration does not authorize release.

### Different schema files can encode conflicting identities

Consider two fictional proposals from the same starting model, where SKU is the stable product identity. The following are schematic declarations, not a particular schema language:

| Proposal A — `products.schema`              | Proposal B — `stock.schema`                          |
| ------------------------------------------- | ---------------------------------------------------- |
| Change identity from `sku` to `product_id`. | Make the stock product reference an `immutable_sku`. |
| Make SKU an editable label.                 | Require that SKU reference to remain stable.         |

The edits occupy different files, so there are no overlapping lines by construction. Their assumptions still conflict. Product `PR-7` initially has SKU `P100`, and stock refers to `P100`. Proposal A permits renaming that SKU to `P101` while retaining `PR-7`. Proposal B requires the stock reference to keep identifying the product through an immutable SKU.

After the proposed rename, stock's `P100` reference no longer matches the product's `P101` label. A system might reject the rename through a constraint, or leave an unresolved reference if enforcement is absent. Neither outcome satisfies both proposals as written. This is a model inconsistency, not evidence of an executed database failure.

![Two non-overlapping schematic schema diffs introduce editable SKU labels under product_id and immutable SKU stock references. The same PR-7 product is renamed from P100 to P101, while stock still references P100, exposing a semantic conflict.](../assets/agentic-coding/concurrent-identity.svg 'Matched fictional proposals from one baseline. No textual overlap does not establish a compatible data model. The reference mismatch is a teaching calculation, not an applied migration or a database constraint test.')

Hold both proposals pending a shared identity decision. If stable product IDs are chosen, coordinate references, migration compatibility, and checks. If SKU remains the identity, reject the mutable-label assumption. An integrator cannot resolve this by choosing one contributor's file contents without resolving the intended model.

### Sequence two tightly coupled edits

A fictional module, `import-errors.ts`, has two authorized changes: fix its header offset and rename `toDisplayRow` to `displayRowNumber`. Both edits affect the same helper and callers. The current calculation is `dataIndex + 2`; the agreed rule requires `dataIndex + 1`. A negative value at data index `1` should therefore report row `2`, not `3`.

Parallel copies could each make progress, but their recombination must reconcile the new name with the corrected body and updated callers. There is little independent work to preserve here. Choose a sequence: **A1** corrects row numbering and its checks; **A2** starts from that result and performs the internal rename, preserving the verified behavior. These are fictional change labels.

![Parallel edits from one baseline change the same row-number helper's body and name and then need reconciliation. The selected sequential plan fixes the offset in A1, renames from that base in A2, and checks dataIndex 1 maps to row 2.](../assets/agentic-coding/concurrent-sequence.svg 'Both layouts retain the same two requested edits and final expectation. Arrows show dependencies, not a timing scale. The sequential choice is justified by coupling; no speedup or productivity measurement is supplied.')

The final check exercises the renamed helper through its relevant caller. Review can keep the purposes visible in one coherent change or dependent units. The result sought is preserved behavior after both edits, not a particular count of agents, branches, or pull requests.

## Assumptions for correctness

Contributors need a current shared contract and a way to surface discoveries. Isolation arrangements must account for all state they touch, and handoff evidence must match the changes actually combined.

Checks can miss unexpressed assumptions. Contract shape alone may not capture identity, ordering, transaction behavior, or compatibility with earlier clients; include the relevant semantics explicitly.

## When to use it

Use this pattern when people and agents implement related changes concurrently, share generated artifacts or environments, or discover clean merges with broken behavior. For one small coupled module, sequential work may be the better coordination plan.

## Tradeoffs and operating costs

Contracts, isolated environments, dependency updates, and combined checks require maintenance. Parallelism is useful when independent progress outweighs that work; more simultaneous tasks are not automatically better flow.

Keep the dependency map in the existing work item and revisit it during ordinary Agile refinement and review. Product acceptance criteria and the team's Definition of Done remain shared references. Assigning integration responsibility does not transfer permission to discard another contributor's work.

## Common mistakes and limitations

Do not equate separate branches with separate working files, separate working files with separate runtime state, or conflict-free text with compatible behavior. One branch per agent is an option, not a universal policy.

An agent can meet its stopping condition while integration remains unfinished. A completed review, a merged change, a verified product increment, and an authorized release are different claims. Make the remaining responsibility visible when work is handed over.

## Related patterns

[[agentic-bound-the-task|Bound the Task]] defines each contributor's authority and return conditions. [[agentic-deliver-small-reviewable-changes|Deliver Small, Reviewable Changes]] chooses coherent review units; this pattern coordinates their concurrent implementation and combination. [[agentic-keep-context-durable-and-discoverable|Keep Context Durable and Discoverable]] preserves contracts and handoff evidence. [[agentic-agree-on-done|Agree on Done]] distinguishes local completion from a verified integrated result.

## Sources and further reading

- [Pro Git: Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell) — branches as commit references.
- [Git: git-worktree](https://git-scm.com/docs/git-worktree) — multiple working trees for one repository.
- [Pact: How Pact works](https://docs.pact.io/getting_started/how_pact_works) — consumer expectations and provider verification.
- [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) — shared integration and semantic conflicts.

All cases, schema declarations, and results are original fictional teaching material. No concurrent agent run, merge experiment, migration, contract-testing framework, or integration pipeline was executed for them.
