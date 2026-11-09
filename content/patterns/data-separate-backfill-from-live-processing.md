---
id: data-separate-backfill-from-live-processing
type: pattern
title: Separate Backfill from Live Processing
summary: "Give historical reruns separate checkpoints and resource budgets so they do not disrupt current processing, while coordinating how historical results replace or join live output."
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

A transformation defect has affected three months of history. The team fixes the logic and starts reprocessing old records through the production pipeline.

Soon, live events are waiting behind historical work. Checkpoints become difficult to interpret, and an older backfill result overwrites a newer live update. The repair has created another incident.

**Run bounded historical work through an independently controlled execution path, while coordinating how its results join or replace live output.**

The two paths can reuse transformation logic. They need separate progress, resource budgets, retry policies, and publication rules because their operating goals differ: live processing protects freshness; a backfill repairs or reconstructs a defined scope.

Separation is complete only when the backfill can pause, fail, restart, or finish without corrupting live progress or taking uncontrolled ownership of shared output.

## Separate execution while preserving meaning

A backfill needs an explicit plan: the output being rebuilt, input versions, processing logic, reference data, and publication policy.

That plan should distinguish reproducing an earlier result from restating history under corrected rules. Both are useful, but they produce different meanings.

Reuse a transformation implementation where possible, parameterized by input scope and versioned configuration. Maintaining unrelated “batch logic” and “streaming logic” makes disagreements harder to diagnose.

The execution paths can still differ. Historical work may scan large snapshots and publish complete partitions. Live work may process small batches and retain state between them. Shared business rules do not require identical scheduling or execution machinery.

![Live processing and a bounded backfill use separate checkpoints and capacity controls. Live updates continue reaching published output. The backfill builds a private candidate, validates coverage, reconciles overlapping changes, and passes a controlled publication gate.](../assets/data-engineering/separate-backfill-from-live-processing.svg "Live and backfill executions have independent checkpoints and budgets. Backfill builds a private candidate and validates it. A version-aware overlap policy and atomic publication prevent older recovery work from overwriting newer live results.")

## Protect live capacity and independent progress

Separate queues help only if they lead to enforceable capacity controls. Backfill workers can still overwhelm a shared source database, exhaust connections, or saturate destination writes.

Give historical work bounded concurrency and request rates, while protecting enough capacity for live processing. Scale or pause the backfill in response to live lag and shared-resource saturation.

Airflow provides a concrete scheduling control: a backfill has its own `max_active_runs`, applied independently of the Dag’s normal `max_active_runs`. This controls concurrent backfill runs; worker and downstream-resource isolation still require appropriate configuration. [Apache Airflow: Backfill concurrency](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/backfill.html#concurrency-control)

Progress must also remain independent. A repair should not reset or advance the live checkpoint. Its retries should resume its own work rather than reinterpret production progress.

Write identities need similar care. Delta Lake’s idempotent batch-writing options use an application identifier and transaction version. Its documentation warns that restarting from a new checkpoint requires a different application identifier when batch numbering restarts, or valid writes may be ignored. Separate execution histories need distinct identities, while retries within one history retain theirs. [Delta Lake: Idempotent streaming writes](https://docs.delta.io/delta-streaming/)

## Example: repair two days without losing late corrections

A sales pipeline needs to rebuild September 24 and 25 using corrected logic. Live processing continues handling newly arriving events.

The backfill reads a pinned source snapshot and builds replacement partitions privately. It validates coverage, totals, and required dimensions before publication.

While it runs, a late September 25 event arrives through the live path. Although historical by event date, it is new work for the live processor.

Replacing September 25 with the backfill’s original candidate would erase that contribution.

A safe publication protocol must reconcile changes since the candidate’s source boundary. Depending on the architecture, it can catch up the candidate, reject publication when the target changed, or briefly coordinate writes to the affected scope.

The final check and replacement must be atomic. Checking for changes and then performing an unconditional replacement leaves another race.

Delta Lake implements optimistic concurrency control by staging writes and validating conflicts before committing a new table version. Its documentation also explains how explicit, disjoint operation conditions can reduce conflicts. These mechanisms help coordinate writers, but do not prove that a candidate includes every required source correction. [Delta Lake: Concurrency control](https://docs.delta.io/concurrency-control/)

The important boundary is output ownership, not simply “old dates versus today.” Live processing may legitimately modify historical partitions.

## Example: divide source coverage by position

A new derived dataset must process retained events while continuing with new arrivals.

For an immutable source log with preserved partition coordinates, the plan can establish this boundary:

| Source partition | Historical path | Live path |
|---|---|---|
| P0 | Offsets below 1200 | Offsets 1200 onward |
| P1 | Offsets below 900 | Offsets 900 onward |

Each path has independent progress. Together, their declared ranges cover the intended source without overlap.

An event timestamp is weaker for this purpose. A record arriving tomorrow can describe something that happened last month. Splitting solely on event time can leave gaps or cause both paths to process the same input.

This boundary assumes the historical source preserves the relevant source identities and coordinates. A database snapshot plus a CDC feed needs a consistent relationship between snapshot state and change position; an arbitrary timestamp does not establish that relationship.

Disjoint input ranges also do not solve stateful handoff.

A running total built from history must exist before later deltas are applied to it. The new processor may need to buffer the tail, build state through the boundary, replay subsequent records in order, and transfer ownership at a coordinated checkpoint.

For windowed calculations, the input needed to rebuild an output can begin before the requested output interval. Lookback windows, sessions, and joins may require additional history. Bounds must follow the computation’s dependencies.

## Example: append an older archive through a dedicated flow

A registration pipeline currently ingests recent files. The team wants to add three earlier years without restarting the live ingestion history.

Databricks Lakeflow supports a specialized append flow with the `ONCE` option for historical ingestion into an append-only streaming table. Its documentation demonstrates separate historical flows alongside ongoing incremental processing. [Databricks: Backfilling historical data](https://docs.databricks.com/aws/en/ldp/flows-backfill)

This is a useful implementation when the archive belongs in the existing raw dataset and schemas are compatible.

It still needs an overlap policy. A file or business event present in both the historical and live inputs can produce duplicate data unless ingestion identities or downstream deduplication handle it.

The execution lifecycle also matters: Databricks documents that these one-time flows run again during a full refresh. “Once” describes the flow’s behavior within that lifecycle, not a permanent prohibition on replay. [Databricks: One-time backfill flows](https://docs.databricks.com/aws/en/ldp/flow-examples)

Appending raw history may be appropriate; appending another copy of an already published aggregate usually is not.

## Keep shared destinations from choosing the wrong winner

Independent processors can finish out of order.

A live update might publish entity version 18, followed by a slower backfill attempting version 17. If the destination chooses the last arrival, older state wins.

Use a publication rule appropriate to the data: source-version guards for complete entity snapshots, stable event identities for immutable events, or coordinated replacement for derived partitions. Delta increments require a different treatment from complete snapshots.

Replaying historical data can also retrigger notifications or other external actions. The backfill’s scope must specify whether it rebuilds derived data, issues corrections, or intentionally repeats business effects. Those outcomes should not be accidental consequences of reusing a pipeline.

Keep a run ledger connecting the backfill plan, attempts, selected inputs, validation, and committed outputs. A finished worker is insufficient evidence that the requested historical scope has been repaired.

## Budget for repair as an ongoing capability

Separation costs additional compute, checkpoints, staging storage, retained inputs, and reconciliation logic. Keeping candidates private until validation also delays the visible repair.

Too much backfill capacity can damage live freshness through shared bottlenecks. Too little can leave historical defects unresolved indefinitely. Both lanes need explicit service expectations.

Monitor live lag, backfill completion and age, shared-resource pressure, write conflicts, and publication outcomes separately. A healthy combined throughput can hide a stalled live stream or a permanently starved repair.

This pattern is useful when historical work is substantial, stateful, or operationally different from ongoing processing. A small, safely bounded correction may fit within an existing pipeline without a dedicated execution environment.

[[data-workload-isolation|Workload Isolation]] supplies resource boundaries. [[data-replayable-backfills|Replayable Backfills]] defines reproducible historical work. [[data-data-aware-dependencies|Data-Aware Dependencies]] identifies required input coverage. [[data-atomic-publication|Atomic Publication]] controls how validated replacements become visible.

Separating the paths gives historical repair its own operating controls. Coordinating their boundaries lets both paths contribute to one trustworthy dataset.
