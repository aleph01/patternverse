---
id: data-model-lifecycle-states-explicitly
type: pattern
title: Model Lifecycle States Explicitly
summary: "Represent meaningful process stages and allowed transitions explicitly, tying actions such as approval or publication to the state and revision they actually apply to."
status: published
aliases: []
tags:
  - data-engineering
  - meaning-boundaries
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

**What it is for**

Represent the meaningful stages of a business object or process, together with the rules governing movement between them.

An article is marked approved. Its author then changes a paragraph, but the approval flag remains set. A publishing job sees `approved = true` and releases material the reviewer has never seen.

Each operation worked locally. The author saved an edit. The reviewer recorded approval. The publishing job checked a field. The failure lies in their shared model: it never established what approval applies to or what editing should invalidate.

Model Lifecycle States Explicitly makes those relationships visible. A record has a defined current state, and changes occur through transitions with explicit prerequisites and consequences.

## A state describes a meaningful condition

A lifecycle state should help explain what is currently true and which actions are permitted.

For an editorial workflow, **Draft**, **In review**, **Approved**, and **Published** imply different responsibilities. Authors prepare drafts. Reviewers assess submitted revisions. Publishing requires approval of the material being released.

A transition connects those conditions. It identifies the action or event that permits movement, any required conditions, and the changes that follow.

For example:

> Publish this article only when its current revision is approved and the requester has publication authority.

The condition is often called a **guard**. W3C’s SCXML specification formalizes states, transitions, triggering events, and guard conditions, although a small application can implement these ideas without adopting SCXML or a dedicated workflow engine. [SCXML state-machine specification](https://www.w3.org/TR/scxml/).

An allowed list of status values establishes valid labels. It does not establish valid behavior.

## Approval belongs to a particular revision

Consider an illustrative editorial process for one publishing cycle.

A draft can be submitted for review. The reviewer can approve it or request changes. Revising requested changes returns the item to Draft so that the author can submit a coherent revision again.

![An editorial lifecycle moves from Draft to In review, then to Approved. A request for changes returns the item to Draft. Approved content can be published only when approval applies to the current revision. Editing approved content withdraws approval and returns it to Draft.](../assets/data-engineering/model-lifecycle-states-explicitly.svg "Draft moves to review, then approved and published. Requested changes or edits withdraw approval and return the item to draft.")

In this design, review operates on a fixed revision. Editing approved content creates a new current revision, withdraws the old approval’s applicability, and returns the item to Draft.

A record might contain:

| Article | Current revision | Approved revision | State |
|---|---:|---:|---|
| A-42 | 7 | 7 | Approved |

If an edit creates revision 8, the publishing operation must not accept revision 7’s approval as authorization for revision 8.

The transition should check the current state and revision relationship together. Merely checking that someone approved the article at some earlier time is insufficient.

The diagram describes one publishing cycle. Revising an already published article requires another explicit policy—for example, preparing a new revision while the existing published version remains available.

This prevents a convenient status label from silently deciding a consequential workflow rule.

## A completed computation is not necessarily a published dataset

An analytical pipeline introduces another modeling problem: several kinds of progress can occur independently.

A transformation may finish successfully, yet its output may fail validation. A validated output may then wait for publication.

Putting everything into one status field can produce names such as `succeeded_but_validation_failed` or `validated_waiting_for_publish`. As concerns accumulate, the list becomes difficult to maintain.

An illustrative design separates three dimensions:

| Concern | Example states |
|---|---|
| Execution | Queued, Running, Succeeded, Failed |
| Validation | Pending, Passed, Failed |
| Publication | Unpublished, Published |

An execution can succeed while validation fails. That combination is useful information, rather than a contradiction.

However, separating the fields does not make every combination valid. Publication still needs a guard: the relevant execution succeeded, validation passed, and the output version being published is the one that was checked.

SCXML supports parallel state regions for situations with simultaneously active aspects of state. The broader modeling lesson is to distinguish genuinely independent concerns while preserving rules connecting them. [Parallel states](https://www.w3.org/TR/scxml/#parallel).

Boolean fields remain useful for independent facts, such as whether a run was manually requested. They become harder to manage when several flags collectively encode one lifecycle without defining its valid combinations.

## Stripe: a failed attempt can leave state unchanged

Stripe’s invoice API provides a documented example of lifecycle states and permitted operations.

Its transition documentation distinguishes draft, open, paid, uncollectible, and void invoices. Finalizing a draft makes it open and enables payment. A failed payment attempt can leave an open invoice open. An uncollectible invoice can subsequently become paid or void. [Invoice status transitions](https://docs.stripe.com/invoicing/integration/workflow-transitions).

| Starting state | Operation or outcome | Resulting state |
|---|---|---|
| Draft | Finalize | Open |
| Open | Payment attempt fails | Open |
| Open | Mark uncollectible | Uncollectible |
| Uncollectible | Successful payment | Paid |

The failed attempt is meaningful even though the invoice remains in the same state. It belongs in the activity history.

Stripe also distinguishes status from additional display information: badges such as past due or retrying can appear while the underlying invoice remains open. [Invoice states](https://support.stripe.com/questions/invoice-states?locale=en-GB).

These distinctions prevent a status field from absorbing every event, warning, or reporting category associated with an object.

## Enforce the move where it happens

A lifecycle diagram communicates intent. Correctness depends on enforcing that intent at the point of change.

**Check the current state atomically.** Reading Approved and publishing later leaves a window in which another operation can edit the article. A transaction, lock, or optimistic version check must ensure that the transition applies to the state actually being changed.

**Check authority and prerequisites.** A valid transition for one actor may be invalid for another. Approval may also depend on required reviews or completed fields.

**Define repeated requests.** Retrying a publication request should not create duplicate releases or notifications. Decide whether an already completed transition returns the previous result, performs no further work, or reports a conflict.

**Separate requests from outcomes.** A cancellation request does not prove that a worker has stopped. An asynchronous process may need a cancellation-requested state and an explicit rule for races with successful completion.

**Coordinate consequences.** Updating Published and sending a notification are different operations. If notification must reliably follow the committed change, use an appropriate publication mechanism rather than assuming both will always succeed together.

**Record the transition evidence.** Current state supports operational decisions. A history containing the previous state, resulting state, actor, time, and reason supports investigation.

A state field does not replace that history. Nor do periodic snapshots establish every transition that occurred between observations.

## Choose states that earn their complexity

Explicit lifecycles are useful when permitted actions depend on progress, when several actors change the same record, or when retries and asynchronous work can produce conflicting outcomes.

They also introduce costs. Transition rules need tests. New states can affect interfaces, reports, permissions, and existing records. Workflow changes may require a policy for items already in progress.

A small process may need only a constrained status field and a few guarded operations. A complicated process may benefit from hierarchical states or a workflow engine. The number of boxes should follow meaningful business distinctions.

Common mistakes include allowing arbitrary status updates, treating every error as a terminal state, and assuming that a name such as Completed means the same thing across execution, validation, and publication.

Another mistake is inventing progress that the evidence does not establish. If an imported record has an unknown status, preserve that uncertainty rather than guessing that it is Draft or Failed.

Exceptions also need explicit handling. Administrative corrections, reopening, and recovery are part of the lifecycle if the business permits them. An undocumented override can defeat an otherwise careful model.

## Related patterns

[[data-separate-entities-from-events|Separate Entities from Events]] distinguishes the object’s current condition from occurrences such as approval, rejection, or a failed attempt.

[[data-separate-definitions-from-instances|Separate Definitions from Instances]] distinguishes a workflow specification from a particular item or execution following it.

[[data-idempotent-writes|Idempotent Writes]] makes repeated transition requests safe where retries are expected.

[[data-transactional-outbox|Transactional Outbox]] coordinates a committed state change with reliable publication of information about it.

[[data-run-ledgers|Run Ledgers]] preserves execution identities and outcomes without forcing every detail into a single status field.
