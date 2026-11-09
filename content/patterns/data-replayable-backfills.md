---
id: data-replayable-backfills
type: pattern
title: Replayable Backfills
summary: "Define historical reruns with pinned scope, inputs, and processing versions, then validate and publish results through a repeatable recovery protocol that coordinates with live work."
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

A reporting bug has affected six months of daily totals. The fix is ready, and the original events still exist. Someone starts a historical rerun.

Halfway through, a worker fails. Meanwhile, reference data changes and live processing continues updating the same tables. Retrying yesterday’s failed task now produces different results—and appends another copy of some rows.

Replayable Backfills make historical processing a defined, repeatable operation. They preserve the inputs, rules, scope, and publication behavior needed to retry or resume without silently changing the question being answered.

The purpose is to rebuild history deliberately while protecting both existing results and ongoing processing.

## Give the backfill a recorded plan

“Run October again” leaves too much unspecified.

A replayable plan identifies what to read, how to interpret it, and where the result belongs:

| Decision | Example |
|---|---|
| Output scope | `[October 1, October 3)` in UTC |
| Input identity | Orders version 438; refunds version 91 |
| Transformation | Logic version 8 and its dependencies |
| Reference data | Category mapping version 12 |
| Temporal meaning | Corrections known through a declared cutoff |
| Destination behavior | Replace the specified daily partitions |
| Progress identity | Plan B42, with separately tracked attempts |

The plan remains stable while individual attempts fail and retry. Changing an input version or business rule creates a new recorded plan.

This is broader than saving a date range. A job that reads “latest,” calls a changing external service, or uses the current date in its business logic may answer a different question each time it runs.

Airflow’s task guidance addresses this directly: reruns should produce the same outcome, operate on specific partitions, and avoid current-time dependencies in critical computation. [Airflow task best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html#creating-a-task)

![Backfill B42 covers the half-open interval from October 1 inclusive to October 3 exclusive, in UTC: October 1 and 2. Source batches 438 and 91, logic v8, and reference v12 are pinned before validated replacement of exactly those output dates.](../assets/data-engineering/replayable-backfills.svg "A backfill covers [October 1, October 3), UTC: October 1 and 2, using source batches 438 and 91, logic v8, and reference v12. It replaces the bounded output after validation rather than appending another copy.")

## Decide which history you want

Two legitimate goals produce different plans.

**Reproduction** asks what an earlier run would have produced from its original inputs and rules. It requires the earlier knowledge boundary and transformation version.

**Restatement** asks what historical results should be under corrected facts or definitions. It intentionally uses a different combination.

A late refund, corrected customer identity, or revised classification can change past results. Including those changes is appropriate when restating history. Including them accidentally makes reproduction impossible.

The plan should therefore identify both the business period being calculated and which recorded knowledge is available to the calculation. Event date and knowledge cutoff are separate dimensions.

## Example: correct daily sales without duplicating them

A daily sales model ignored refunds. Two orders attributed to October 1 contain:

| Order | Gross EUR | Refund EUR | Corrected net EUR |
|---|---:|---:|---:|
| O1 | 100 | 20 | 80 |
| O2 | 50 | 0 | 50 |

Under the declared rule—attribute orders to their order date and include refunds known by the selected cutoff—the corrected total is 130 EUR rather than 150 EUR.

The backfill pins the relevant order and refund versions and applies corrected logic version 8. It writes a replacement October 1 result into staging.

Appending 130 to the existing 150 is incorrect. Adding a −20 adjustment can work under a carefully designed adjustment model, but repeating that adjustment would subtract another 20.

A straightforward replacement design publishes the complete rebuilt partition once validated. Retrying the same plan replaces it with the same result.

Replacement must handle disappearance too. If a correction removes the last qualifying row for a category, an upsert containing only surviving rows can leave the obsolete category total behind. The write needs explicit deletion or replacement semantics for the complete intended scope.

Versioned tables supply useful input primitives. Delta Lake supports reads of specific historical versions; Iceberg supports snapshot-ID reads through its Spark integration. These features identify input states, while the backfill plan records which states belong together. [Delta Lake historical reads](https://docs.delta.io/delta-batch/#query-an-older-snapshot-of-a-table-time-travel), [Iceberg time-travel queries](https://iceberg.apache.org/docs/latest/spark-queries/#time-travel-queries-with-sql)

## Example: rebuild a rolling feature with enough history

A new model needs a device’s trailing thirty-minute error count for every observation between 10:00 and 11:00.

Reading only observations from that output interval gives incorrect early results. An observation at 10:01 also depends on relevant events before 10:00.

The backfill distinguishes its **read scope** from its **output scope**. It reads sufficient earlier history to establish the rolling state, computes through the requested interval, and publishes only results whose output timestamps belong to `[10:00, 11:00)`.

That earlier history is often called a warm-up period.

Its required size follows the computation. A fixed thirty-minute rolling window has a bounded dependency. A session can extend much farther backward through a continuous chain of activity. A lifetime cumulative count may require state from the beginning or a compatible earlier checkpoint.

Historical enrichment needs similar care. Joining every old observation to today’s device classification changes the feature’s meaning. The plan must specify whether classification is evaluated as of the observation or under a deliberately restated mapping.

Splitting work into daily tasks does not automatically make those tasks independent.

## Example: fill history while live ingestion continues

A normalized event table needs older records while its live ingestion keeps running.

One possible design chooses a durable source-position boundary for each partition:

| Partition | Historical work | Live work |
|---|---|---|
| P0 | Retained offsets below 1200 | Offsets from 1200 onward |
| P1 | Retained offsets below 900 | Offsets from 900 onward |

Both paths use a compatible transformation contract and write records under a stable identity such as `(source, partition, offset)`. Repeating a historical chunk then cannot create another copy of the same source record.

These boundaries separate source records, not business time. A newly arriving event can have yesterday’s event timestamp and still belong to the live side.

This arrangement suits independent event normalization. Stateful aggregates and current-state projections require additional coordination: compatible state handover, ordered catch-up, version guards, or isolated reconstruction followed by cutover.

Otherwise, a historical worker can overwrite a newer live result.

The boundary must also remain readable throughout execution. If source retention removes historical records before their chunks finish, the plan can no longer be completed from that source.

## Schedule historical work without changing its meaning

A backfill scheduler creates and manages executions. It cannot make their computation replayable by itself.

Airflow provides historical runs with explicit reprocessing behavior and backfill concurrency controls. Those determine which scheduled intervals are attempted and how many run together. They do not pin mutable inputs or make destination writes safe. [Airflow backfill controls](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/backfill.html)

Track progress by logical work unit—such as a partition under plan B42—while retaining attempt history separately. A retry continues that unit rather than inventing a new output identity.

Dependencies determine execution order. Independent partitions can run concurrently; computations that carry state across boundaries need ordered execution or suitable starting state.

## Validate and publish the intended replacement

Useful checks go beyond whether tasks finished: verify input coverage, output grain, duplicate keys, expected deletions, and reconciled totals.

Comparison should explain differences. In the sales example, the 20 EUR reduction should correspond to the included refund rather than an unexplained shift in row counts.

Staging keeps incomplete work away from readers. Publication can then replace validated partitions or switch readers to a completed release. Publishing individual days may be acceptable; a report requiring one consistent six-month restatement may need a broader release boundary.

Derived tables, caches, and exports also need an explicit propagation plan. Rebuilding a base table does not automatically correct every downstream result.

Operational side effects deserve separate handling. Replaying historical business events should not inadvertently resend customer notifications or recreate external actions.

## Budget for the replay horizon

Costs include historical scans, joins, shuffle, temporary output, retained versions, validation, and competition with live workloads. Bounded concurrency and isolated capacity can preserve live freshness.

Input retention is a hard limitation. Delta Lake documents that historical reads require both the transaction history and the data files for the selected version. A version number cannot restore files already removed. [Delta Lake retention requirements](https://docs.delta.io/delta-batch/#data-retention)

Monitor completed coverage, failed units, publication status, resource consumption, and live-processing lag. A backfill is complete when the declared scope is correctly published and its required downstream effects are resolved.

## Related patterns

[[data-preserve-raw-inputs|Preserve Raw Inputs]] retains material for historical reconstruction. [[data-deterministic-transformations|Deterministic Transformations]] makes a pinned plan repeatable.

[[data-checkpoint-and-resume|Checkpoint and Resume]] preserves progress through large replays. [[data-historical-restatement|Historical Restatement]] defines how corrected history should change published business results.
