---
id: agentic-keep-work-recoverable
type: pattern
title: 'Keep Work Recoverable'
summary: 'Retain a restorable work state and an evidence-based handoff so failed attempts can be abandoned without losing what was learned.'
status: published
tags:
  - agentic-coding
  - recovery
  - version-control
  - handoffs
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of version-control recovery, transactional boundaries, and evidence-based handoffs. Worked cases and revision labels are fictional; reference calculations are identified separately.'
---

## Purpose and problem

The agent fixes a CSV error, breaks quoting, restores quoting, then changes the error expectation. The patch grows while the original failure becomes harder to reproduce. Starting a fresh conversation may remove the confusing narrative, but it cannot reconstruct overwritten work or reverse a notification already delivered.

Keep Work Recoverable pairs a recoverable state with retained learning. It makes abandoning an attempt practical without erasing the evidence needed for a better one.

## Core idea

Preserve two things separately: **what can be restored** and **what has been learned**. Before uncertain work expands, identify a recoverable source state, its verified scope, unfinished changes, and any external effects. When progress becomes a repair loop, stop adding speculative changes, retain the failure evidence, and choose a controlled return or a different approach.

Recovery succeeds when the resulting state is inspected and useful work can resume. A command reporting success or a confident handoff is insufficient.

## How it works

### Define the recovery boundary

A checkpoint has a scope; “we can roll back” needs one too.

| State                  | What it establishes—and leaves open                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Local checkpoint       | A captured source/workspace state; only captured files and configuration are recoverable                  |
| Reviewable commit      | An inspectable change with a coherent purpose; review or acceptance is not implied                        |
| Integrated version     | Changes combined with a shared base; compatibility depends on checks at that version                      |
| External-effect record | Identified writes, queued work, deliveries, and repair obligations; source restoration does not undo them |

Capture source identity, dirty changes, relevant dependency/configuration state, and checks with their limits. Preserve untracked fixtures or ignored files explicitly when the selected mechanism does not capture them. A local snapshot is not an independent backup against losing the repository itself.

Git’s [revert documentation](https://git-scm.com/docs/git-revert) distinguishes adding commits that reverse earlier patches from restoring files or discarding working changes. Follow the repository’s version-control conventions. For shared or published work, prefer a coordinated corrective change over rewriting history that others depend on; reversing a patch can still conflict with later work.

GitButler’s [operations history](https://docs.gitbutler.com/features/timeline) captures repository/workspace state, including uncommitted work. Its installed CLI guidance also provides named snapshots. That recovery scope can include other contributors’ work: inspect the affected state before restoring it. In a shared workspace, do not use a whole-workspace undo as shorthand for removing one agent’s attempt. Isolate or selectively remove the owned changes through the supported workflow, preserving unrelated work.

### Stop the loop with a decision

A repair loop repeats explanations or edits without improving the reproduced behavior, grows beyond the original boundary, or weakens checks to make failure disappear. Bound exploration by a meaningful decision point or investigation allowance; there is no universal retry count.

Choose among continuing with new evidence, replacing the approach, restoring an owned experiment, or restarting the session. Restart when conversational assumptions obstruct diagnosis; restore when the work state is tangled. Either may be needed independently of the other. Before removing anything, save the minimized input, exact reproduction, expected and observed behavior, attempted explanations, and remaining uncertainty outside the removal scope.

Keep product acceptance criteria and the team’s Definition of Done intact. A recovery task can stop after restoring the baseline and recording the remaining failure. That does not complete the feature, approve a reviewable change, integrate it, or authorize release. Update the existing task or backlog item with the new implementation decision and remaining obligations; no extra Agile ceremony is required.

## Worked examples

These cases and revision labels are fictional. CSV and stock arithmetic are independently checked reference calculations; no repository rollback, production repair, or fresh agent execution is claimed.

### Leave a parser repair loop with the failure intact

Checkpoint **C0** passed the ordinary one-line CSV checks. A minimized fixture **F1** adds a quoted CRLF inside a note:

```csv
sku,note
P100,"front
shelf"
```

C0 parses one data record correctly, preserving `front\r\nshelf`, but its preview reports data row **2** rather than **1**. It was a known passing baseline for the earlier checks, not a correct implementation of every newly discovered case.

Two speculative local revisions follow: **E1** removes quotes and fragments the record; **E2** restores quotes but removes the embedded newline and changes the note. Neither preserves the required input meaning. The next patch would merely hide the symptom.

The engineer retains F1 and the failure record outside the owned experiment’s removal scope, then restores only that experiment to C0. Other contributors’ changes remain untouched. Re-running the baseline checks and F1 should recover the earlier passing behavior and the same row-number failure. Recovery has preserved the bug for investigation rather than silently “fixing” it by dropping its input.

A Python CSV reference reads three physical lines but returns one data record. Using physical line count minus the header gives `3 − 1 = 2`; numbering the first logical data record gives **1**. This supports investigating the preview’s row mapping instead of modifying quoting. The application adapter still needs inspection and a verified correction.

![Fictional source history branches from C0 through abandoned local experiments E1 and E2. A separate retained-evidence path carries F1, expected row 1, and observed row 2 into a new diagnosis after owned code returns to C0.](../assets/agentic-coding/recover-checkpoint.svg 'The source path and knowledge path have different recovery scopes. C0 preserves earlier passing behavior while F1 still fails. Labels are fictional; no history operation was executed, and other contributors’ changes are outside the removal scope.')

### Restore code without pretending external effects disappeared

A faulty import **I7** adds five units to stock **P100** and sends notification **N7**. Initial stock was **10**; an unrelated sale **S9** then removes two units. The current quantity is **13**. Restoring the earlier code leaves that quantity and the delivered notification unchanged.

For an open transaction, PostgreSQL documents [rollback before commit](https://www.postgresql.org/docs/18/tutorial-transactions.html); its [ROLLBACK reference](https://www.postgresql.org/docs/18/sql-rollback.html) concerns the current transaction. A committed import requires a separate data-repair decision, not a later rollback of the original transaction.

First contain further faulty execution and account for queued or in-flight work. The recovery owner correlates I7’s write and N7’s delivery with the current ledger. In this simplified additive-stock model, if domain checks permit, a compensating entry **C7** references I7 and subtracts five: `13 − 5 = 8`. Resetting stock to its old value of 10 would erase S9’s legitimate effect. Reservations, fulfillment, or further dependencies could invalidate this simple compensation.

[Microsoft’s compensation guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) explains why repair must account for concurrent work and can itself fail. C7 needs a stable identity and transactional duplicate protection so a retry does not subtract five twice. A delivered N7 cannot be recalled by source control; an authorized correction or reconciliation is a new action. Unknown delivery must be investigated rather than treated as permission to resend.

The recovery record therefore keeps code, data, notification status, and pending repair separate. Quantity 8 is a conditional target in this model, not an executed production repair or proof that the incident is resolved.

![Code restoration changes the faulty source revision but leaves stock at 13 and notification N7 delivered. A conditional compensating entry C7 removes only import I7’s five units, preserving unrelated sale S9 and targeting stock 8; the notification remains a separate obligation.](../assets/agentic-coding/recover-effects.svg 'Same I7 import and S9 sale throughout. Code, committed data, and delivered messages have separate recovery mechanisms. The arithmetic assumes additive stock and permitted compensation; no database repair, delivery recall, or duplicate-protection implementation was executed.')

### Resume from evidence instead of inherited confidence

After returning the owned parser work to C0, the next session receives **R1**, a short resumption brief. It replaces “parser fixed, finish the screen” with an inspectable starting point:

| Evidence in R1                             | Claim and next check                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| C0 plus uncommitted preview diagnostics D1 | Inspect the actual changes; D1 is logging, not a verified correction     |
| F1 and reproduction procedure              | Expected row 1; observed row 2; baseline checks pass                     |
| E1/E2 marked abandoned                     | Quote removal and newline removal changed input meaning                  |
| Effect boundary                            | This local probe made no writes or sends; incident I7 is a separate case |
| Unresolved question                        | Does the adapter use physical line position for a logical record number? |

The fresh session inspects the source and dirty state, verifies fixture identity, and reproduces the mismatch before editing. If actual state differs, it updates R1 rather than forcing the repository to match the summary. The next bounded task is to inspect the adapter and test a row-mapping correction while preserving the parsed note.

This starts a new diagnosis without losing verified learning or importing a discarded implementation. R1 does not establish a root cause, restore a missing file, or replace checking current state. Repeatedly restarting without changing the evidence or approach simply recreates the loop.

![Resumption brief R1 points to actual C0 source plus uncommitted diagnostics D1, retained fixture F1 and row mismatch, abandoned explanations, and the adapter question. The new session verifies those anchors before choosing a bounded next edit.](../assets/agentic-coding/recover-resume.svg 'R1 is a constructed handoff, not an executed fresh session. Arrows mean evidence is inspected before action. A concise brief preserves verified observations and uncertainty while source and dirty-state checks establish whether the brief is still current.')

## Assumptions for correctness

The checkpoint must exist, contain the required state, and remain compatible with the environment. Recovery must have authority over the affected changes and effects. Reproductions need stable inputs and honest expectations. Inspect external systems when their state is uncertain; neither an empty diff nor a restored branch proves that nothing happened outside the repository.

## When to use it

Use this pattern for speculative repairs, risky refactors, interrupted sessions, tangled partial changes, or work that can create persistent effects. A small, understood defect with a clear correction may need a focused fix rather than abandoning the attempt.

## Tradeoffs and operating costs

Capturing state and retaining useful evidence costs storage and attention. Recovery can discard valuable implementation progress, while compensation may cost more than the original operation. Choose checkpoint boundaries around meaningful risks; preserve focused failure evidence rather than every conversation turn or temporary artifact indefinitely.

## Common mistakes and limitations

“Known good” can overstate a narrow passing suite. A broad reset can erase unrelated work, a shared-history rewrite can disrupt collaborators, and an old version can be incompatible with new data. Repeating a repair without duplicate protection can compound damage. A recovery note without its referenced files is unusable; a restored source tree without retained learning invites the same failed attempt.

## Related patterns

[[agentic-keep-context-durable-and-discoverable|Keep Context Durable and Discoverable]] preserves findable, current knowledge. This local draft adds restorable state and controlled abandonment.

[[agentic-steer-through-evidence|Steer Through Evidence]] is a local draft selecting decision-changing checks; recovery handles an attempt that should stop or be replaced.

[[agentic-coordinate-concurrent-work|Coordinate Concurrent Work]] is a local draft defining ownership and isolation so recovery does not overwrite another contributor.

[[separate-reversible-from-irreversible-decisions|Separate Reversible from Irreversible Decisions]] is the published general principle. This article specifies engineering recovery boundaries and retained evidence.

## Sources and further reading

- [Git: revert](https://git-scm.com/docs/git-revert) — reversing patches through new history, distinct from restoring or discarding files.
- [GitButler: Operations History](https://docs.gitbutler.com/features/timeline) — repository/workspace snapshots; CLI recipes were also checked against the installed GitButler skill.
- [PostgreSQL 18: Transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html) and [ROLLBACK](https://www.postgresql.org/docs/18/sql-rollback.html) — transaction scope and the boundary at commit.
- [Microsoft: Compensating Transaction](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) — domain-specific repair, concurrent changes, retry identity, and incomplete recovery.
