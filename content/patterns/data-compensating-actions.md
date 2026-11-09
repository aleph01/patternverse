---
id: data-compensating-actions
type: pattern
title: Compensating Actions
summary: "Recover a partially completed workflow through explicit, scoped actions that correct its business effects, without undoing unrelated work or assuming a global rollback."
status: published
aliases: []
tags:
  - data-engineering
  - execution-recovery
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

An export workflow reserves processing capacity, starts an external job, and registers the delivery in a catalog. The first two steps succeed. Registration fails permanently.

The workflow cannot roll back one database transaction because the effects belong to different systems. Abandoning the run would leave an unwanted job consuming reserved capacity. Restoring an old snapshot could erase unrelated work completed in the meantime.

**Define explicit actions that neutralize or correct an operation’s effects when the larger workflow cannot complete. Execute those actions as durable, recoverable work.**

A compensation might release a reservation, cancel a job, withdraw a publication, or issue a correction. Its purpose is to reach an acceptable state while preserving legitimate concurrent activity.

Microsoft’s Compensating Transaction pattern describes this distinction: recovery is application-specific and need not return the system to its exact starting state. [Azure Architecture Center: Compensating Transaction](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction)

## Recovery creates another history

A database rollback discards uncommitted changes within its transaction boundary. Compensation happens after effects may already have committed and become visible.

That makes a compensation a new operation with its own identity, preconditions, side effects, and failure modes.

“Release reservation R42” expresses the intended recovery better than “restore available capacity to 100.” The first identifies this workflow’s contribution. The second assumes nothing else has changed.

Compensation is a central mechanism in **sagas**: workflows composed of local transactions whose effects can be compensated if the overall operation fails. The saga coordinates the sequence; each compensating action supplies the domain-specific recovery behavior.

Temporary inconsistency is part of this arrangement. Other systems may observe the forward effects before recovery finishes. A compensated outcome therefore does not mean that nobody could tell the operation happened.

![An export workflow reserves capacity R42 and starts job X42 before delivery registration fails. Recovery cancels X42 and waits for termination, releases only R42, then records a compensated outcome. Recovery progress remains durable because compensation can also fail.](../assets/data-engineering/compensating-actions.svg "Capacity starts at 100. R42 reserves 10 and R43 reserves 5, leaving 85. After cancelling external job X42 and confirming termination, releasing only R42 returns capacity to 95. R43 remains reserved; release R42 is idempotent.")

## Example: release one reservation without erasing another

Consider a service with 100 units of available processing capacity:

| Action | Available capacity |
|---|---:|
| Workflow A reserves 10 units as R42 | 90 |
| Workflow B reserves 5 units as R43 | 85 |
| Workflow A fails and releases R42 | 95 |

The valid recovery state is 95. Restoring the original value of 100 would incorrectly release B’s reservation.

A reservation record gives recovery a precise target. An atomic transition from `reserved` to `released` can return R42’s ten units once. Repeating the release request finds the reservation already released and does not add another ten.

If A started an export using that capacity, recovery may first need to cancel the export and confirm that it has stopped. Otherwise, the service could reallocate capacity while the original job continues consuming it.

This order follows the resource dependency. Other workflows may require a different order, and independent compensations may run concurrently.

## Prepare recovery before the acknowledgment can disappear

A subtle failure occurs when a forward operation takes effect but its response never reaches the orchestrator.

Suppose the external service starts export X42, then the request times out. Registering compensation only after receiving success leaves no recovery action for an export that actually exists.

Where partial or uncertain completion is possible, record the compensation intent before invoking the forward action. Allocate a stable operation identifier in advance, so recovery can locate the effect even without a successful response.

Temporal’s explanation of compensating actions recommends this ordering and shows why compensations must tolerate the forward action never having happened. Its Saga documentation provides SDK examples, including Java’s `Saga` helper. [Temporal: Compensating actions](https://temporal.io/blog/compensating-actions-part-of-a-complete-breakfast-with-sagas), [Temporal: Saga pattern](https://docs.temporal.io/design-patterns/saga-pattern)

Registration alone does not settle the outcome. Recovery may need to query X42, request cancellation, or reconcile the provider’s records.

A “not found” response is insufficient if an original request can still complete later. The protocol must account for that race—for example, through a provider-supported cancellation state that prevents late execution, or reconciliation that detects and compensates late completion.

The assumption is explicit: the participating systems expose enough identity, status, and conditional behavior to establish a valid recovery outcome.

## Example: withdraw a bad publication without overwriting a newer one

A pipeline publishes dataset release R18, then discovers that a required validation was omitted. Its recovery policy permits restoring the previously accepted release R17.

An unconditional pointer update is dangerous. Another run may already have published a valid R19.

The compensation should express a condition:

> Replace R18 with R17 only if the current release is still R18.

The comparison and pointer change must be atomic. If the pointer now identifies R19, recovery stops that replacement and evaluates the current situation instead of overwriting it.

The action also needs retained references to R17 and an audit record linking the withdrawal to R18.

This compensates publication state. It cannot undo queries already executed against R18 or automatically repair downstream datasets derived from it. Those consumers may require invalidation, correction events, or targeted recomputation.

Deleting R18’s files immediately would introduce another problem if active readers still reference them. Publication recovery and physical cleanup need separate lifecycle rules.

## Example: correct a delivered result

An export has already reached a partner when a transformation defect is discovered. Canceling the local job cannot recall the delivered bytes.

Here, the meaningful compensation may be a versioned replacement and a correction notice identifying which delivery it supersedes. If the partner supports retraction, the workflow can request it and track acknowledgment.

The resulting history contains an original delivery and a correction. Pretending the original never existed would make reconciliation harder.

Some effects have no adequate compensation. That limitation should influence workflow design: perform critical validations before irreversible delivery, and defer irreversible steps until their prerequisites are satisfied.

Compensation restores an agreed business condition where possible; it cannot guarantee physical reversal of every effect.

## Execution engines manage coordination, not meaning

Workflow systems can preserve execution history, dispatch handlers, and resume recovery. They cannot infer what “undo” means for a reservation, publication, or external delivery.

Camunda implements compensation through BPMN compensation events and associated handlers. Its documented behavior invokes handlers for completed activities within the applicable scope; active or terminated activities are not covered by that mechanism.

Ordering also requires attention. Camunda documents that compensation handlers are invoked without a specific order by default. Where order matters, the process must explicitly target and coordinate activities. [Camunda: Compensation events](https://docs.camunda.io/docs/8.8/components/modeler/bpmn/compensation-events/)

A general “run everything backward” assumption can therefore be wrong both semantically and operationally.

## Compensation must survive its own failures

A cancellation service can be unavailable. A release may commit while its acknowledgment is lost. A recovery worker can crash halfway through.

Record recovery progress durably, with distinct states such as `compensation_pending`, `compensating`, `compensated`, and `manual_review_required`. Preserve the original failure separately from recovery failures.

Each action needs a stable identity across retries. Repeating “release R42” must remain safe even if the first attempt succeeded. Checkpointing the workflow is insufficient if the action itself can apply twice.

Microsoft specifically identifies resumable compensation, idempotent commands, retained recovery information, and manual intervention as necessary considerations. [Compensating Transaction: Recovery considerations](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction)

Monitor unresolved recovery age and affected resources. A workflow marked “failed” may still hold capacity, expose an incorrect release, or await an external correction.

## Choose compensation when forward recovery is insufficient

Compensation is useful for long-running operations spanning independent systems, provided temporary inconsistency is acceptable and meaningful recovery actions exist.

It adds substantial operating costs: more service calls, retained history, resource-specific logic, retries, reconciliation, and difficult failure testing. Cancellation and reversal paths can become as complex as forward processing.

Transient failures may be better handled by continuing the original workflow. Compensation should follow an explicit decision that the forward outcome is no longer wanted or achievable.

[[data-bounded-retries|Bounded Retries]] helps define that decision. [[data-idempotent-writes|Idempotent Writes]] makes repeated recovery commands safe. [[data-checkpoint-and-resume|Checkpoint and Resume]] preserves recovery progress. [[data-atomic-publication|Atomic Publication]] reduces the amount of externally visible work that might later need correction.

Compensating actions make recovery an intentional part of the workflow, with its own durable evidence and verified outcome.
