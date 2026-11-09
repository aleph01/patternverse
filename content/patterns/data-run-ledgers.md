---
id: data-run-ledgers
type: pattern
title: Run Ledgers
summary: "Record intended work, attempts, input versions, and verified output outcomes in a durable ledger, distinguishing uncertain results from confirmed failures or completion."
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

A dashboard changed overnight. The scheduler shows a successful pipeline run, but the team cannot establish which source versions it read, whether an operator retried it, or which output commit belongs to that execution.

Elsewhere, a worker reports failure after losing its connection. Its destination may already contain the completed output. Rerunning immediately could duplicate work; trusting the failure status could leave a successful publication undocumented.

**Maintain a durable ledger connecting intended work, execution attempts, inputs, processing versions, and verified output outcomes.**

A run ledger makes a pipeline’s history queryable. It supports diagnosis, reconciliation, replay, and operational decisions without requiring someone to reconstruct every incident from transient logs.

Its strongest entries connect claims to evidence: a source snapshot, validation result, destination commit, or published manifest.

## Give intent, attempts, and outputs distinct identities

A pipeline definition describes recurring work: “build daily sales.” A logical work item identifies a particular intended result: “build October 25 sales from these inputs using this transformation.”

An attempt records one execution of that work. A publication identifies the result that actually became committed or visible.

These identities answer different questions:

| Identity | Example | Meaning |
|---|---|---|
| Job | `daily_sales` | Reusable pipeline definition |
| Work item | R42 | One specified output and processing plan |
| Attempt | A2 | One execution of R42 |
| Publication | Version 119 | A committed destination result |

A retry can retain the work-item identity while receiving a new attempt identity. Changing the input snapshot or transformation changes the work definition and should be recorded explicitly, rather than silently presented as another identical attempt.

Naming varies across platforms. OpenLineage, for example, defines Jobs, Runs, and Datasets; each Run has a unique identifier retained across its lifecycle events. A broader ledger can map those execution identifiers to its own logical work and publication records. [OpenLineage: Object Model](https://openlineage.io/docs/spec/object-model/)

![A run ledger connects logical work R42, pinned inputs and logic, attempts A1 and A2, and destination version 119. A2 initially has an unknown outcome after losing its acknowledgment. Reconciliation finds a publication receipt naming R42 and A2 and confirms the commit.](../assets/data-engineering/run-ledgers.svg "Run R42 attempt A1 fails. A2 publishes release 119 but loses its acknowledgement. The ledger records an uncertain outcome until the durable commit receipt confirms release 119, avoiding a duplicate publication.")

## Record enough to explain the result

A useful ledger captures the output scope, actual input identities, processing version, execution lifecycle, and publication evidence.

For a batch pipeline, input identity might mean table snapshots, immutable file manifests, or source-version ranges. For a stream, it might mean partition-offset ranges associated with a committed processing unit.

Record transformation code or artifact versions, relevant configuration, and reference-data versions. A table name and a deployment label such as “current” will not reliably identify yesterday’s computation.

Keep business coverage separate from execution time. The interval being processed, when the attempt started, and when publication completed are different facts.

Validation outcomes, row counts, checksums, error categories, and ownership can strengthen the record. Counts are evidence about processing volume; matching counts alone does not establish correctness.

Large manifests and diagnostic artifacts can live elsewhere, provided the ledger retains durable references and those artifacts remain available for the required period.

## Example: explain a delayed daily run

An illustrative work item defines:

| Field | Recorded value |
|---|---|
| Work item | R42 |
| Output scope | Sales for `[October 25, October 26)`, UTC |
| Inputs | Orders version 438; returns version 91 |
| Transformation | Artifact version 8 |
| Attempts | A1, then A2 |
| Published result | Destination version 119 |

A1 starts on October 26 at 06:00 and fails before publication. A2 starts at 07:15 and completes the same plan.

The ledger can explain both the data’s meaning and its delay. October 25 is the business interval; 07:15 is an execution timestamp.

Airflow implements part of this distinction through Dag runs, data intervals, logical dates, and task attempts. Its documentation also describes preserving task-instance history when tasks retry or are cleared, while noting that related objects such as XComs and rendered fields are not all retained in that history. [Apache Airflow: Dag Runs](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html)

Scheduler history is therefore useful evidence, but a reproducible ledger may need additional input and artifact references.

The ledger cannot reproduce R42 after its source snapshots and processing artifact have been deleted. Identification and retention must work together.

## Example: resolve a lost publication acknowledgment

Attempt A2 submits its output, then loses the connection before receiving acknowledgment.

A weak ledger records `failed` and launches another attempt. A stronger design records an uncertain publication outcome and reconciles it against the destination.

The destination commit contains stable correlation information:

| Destination evidence | Value |
|---|---|
| Committed version | 119 |
| Work item | R42 |
| Attempt | A2 |

Finding that receipt establishes that A2 published successfully. Recovery updates the ledger’s current interpretation while preserving the original timeout observation.

Delta Lake offers a concrete source of such evidence. Table history includes committed versions, operations, operation metrics, and optional user-defined commit metadata. An application can attach identifiers that connect a table commit to its work and attempt records. [Delta Lake: Retrieve table history](https://docs.delta.io/delta-utility/#retrieve-delta-table-history)

A correlation tag is not an idempotency mechanism. It helps find a commit; preventing duplicate writes requires separate destination guarantees.

Likewise, failing to find a receipt does not immediately prove that nothing committed. The original request may still be in flight. Recovery must settle or fence the old writer and use a safe retry protocol.

## Close the gap between publication and bookkeeping

Writing `succeeded` before publication can claim an output that never appears. Publishing first and updating the ledger afterward leaves a crash window in which the output exists but the ledger remains incomplete.

A ledger alone cannot remove this dual-write problem.

Where possible, record the publication identity and its receipt atomically with the destination mutation. Otherwise, embed stable identifiers in authoritative destination metadata and provide reconciliation.

Ledger updates also need concurrency control. An obsolete attempt must not overwrite a newer attempt’s confirmed outcome merely because its delayed status message arrives last.

An append-only history of observations, combined with a controlled current-state projection, often makes these distinctions easier to preserve. Record event time and receipt time separately, deduplicate repeated notifications, and enforce valid state transitions.

A missing heartbeat establishes uncertainty about a worker. It does not establish that all its effects failed.

## Example: show partial completion across destinations

A product pipeline updates a warehouse table and a search index. The warehouse commits, but indexing fails.

One Boolean `success` field cannot describe the situation adequately:

| Work item | Output | Outcome |
|---|---|---|
| R77 | Warehouse version 204 | Committed |
| R77 | Search index generation 88 | Pending recovery |

The overall work item remains incomplete under its declared completion policy, while the warehouse publication remains a recorded fact.

Recovery can target indexing instead of blindly repeating both writes. If the outputs must be withdrawn together, compensation becomes separate tracked work.

“Every attempt reached a terminal state” and “every required output is verified” are different completion conditions. Define which one the ledger’s summary represents.

## Use lifecycle standards without overstating them

OpenLineage supplies an event model for reporting execution lifecycle, inputs, outputs, and additional metadata. Its run cycle includes states such as `START`, `RUNNING`, `COMPLETE`, `FAIL`, and `ABORT`. [OpenLineage: The Run Cycle](https://openlineage.io/docs/spec/run-cycle/)

These events can populate a ledger and connect execution history to lineage. They do not automatically verify destination commits or enforce a recovery decision.

Continuous processing also needs finer units than one everlasting “running” row. Record checkpoints, microbatches, or committed offset ranges alongside the deployment’s lifecycle. OpenLineage explicitly distinguishes continuous streaming jobs from finite batch jobs and describes periodic reporting for them. [OpenLineage: Processing types](https://openlineage.io/docs/spec/run-cycle/#processing-types-and-job-lifecycles)

Choose a recording granularity that supports the recovery questions the system must answer.

## Pay for durable evidence deliberately

Run ledgers are valuable when pipelines are retried, backfilled, audited, or operated across multiple systems.

Their costs include metadata writes, indexes, artifact retention, reconciliation, schema evolution, and operational ownership. Recording every row as a ledger event can overwhelm the control system; recording only one final status can conceal partial outcomes.

If the ledger controls admission or duplicate prevention, its availability and consistency become part of the processing path. If it serves only observation, temporary reporting gaps may be acceptable, provided evidence can be recovered.

[[data-replayable-backfills|Replayable Backfills]] uses recorded plans and input identities. [[data-atomic-publication|Atomic Publication]] supplies a precise publication boundary. [[data-idempotent-writes|Idempotent Writes]] makes uncertain retries safer. [[data-checkpoint-and-resume|Checkpoint and Resume]] records progress within execution.

A run ledger connects these mechanisms into an accountable history: what was intended, what was attempted, and what the destinations can prove happened.
