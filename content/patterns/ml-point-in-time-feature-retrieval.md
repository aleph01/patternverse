---
id: ml-point-in-time-feature-retrieval
type: pattern
title: 'Point-in-Time Feature Retrieval'
summary: 'Reconstruct features for each historical decision using the right entity, time cutoff, availability history, and freshness policy, while retaining decisions with missing matches.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A model predicts a merchant's next-hour order volume at 10:00. Months later, an analyst rebuilds its training data by joining those historical decisions to today's feature table. The table contains a counter updated at 10:05 and corrections written even later. Offline results improve, but the reconstructed model has received information its original prediction path could not use.

Point-in-Time Feature Retrieval reconstructs an input for **each decision's own cutoff**. It prevents a historical training example from borrowing a later feature value merely because that value is available when the training query runs.

## Core idea

Match the entity and retrieve the newest eligible feature snapshot at the historical decision time. Eligibility depends on the intended experiment.

For an operational replay, distinguish **event time**, describing the snapshot, from **availability time**, when that particular version became usable by the prediction path. A snapshot can describe 09:30 while arriving at 10:20. A correction can retain its original event time while becoming available much later.

Event-time correctness and “known then” correctness are different requirements. If the aim is reproducing available inputs, both clocks matter. If the aim is retrospective analysis using corrected historical facts, another policy may be appropriate; name that policy explicitly.

## How it works

Give each training example an entity key and a decision timestamp, separate from the time its outcome label becomes observable. Retain historical feature versions, their event times, and suitable availability metadata. A later label may be attached for supervision without moving the feature cutoff forward.

For the replay policy here, a candidate must match the entity, have **event time ≤ decision time**, have **availability time ≤ decision time**, and be no older than the chosen maximum age. Age means **decision time − event time**, not time since ingestion. Every boundary includes equality.

Filter candidates **before** selecting the newest event. Among eligible snapshots, resolve versions by latest availability, then highest source revision for remaining ties. This explicit rule assumes those revisions identify authoritative versions. Ranking first and discarding an unavailable winner afterward can miss an older eligible version.

Keep every decision row. If no snapshot qualifies, return a missing value and handle it through a separate, declared policy. [DuckDB's ASOF documentation](https://duckdb.org/docs/stable/guides/sql_features/asof_join) explains temporal matching and left joins that retain unmatched observations. A single timestamp inequality does not automatically enforce the two-clock policy above.

## Worked examples

### The value known at 10:00

These fictional records describe snapshots of `orders_last_hour`. All times are UTC on 12 May 2026. The retained archive is queried at 10:30; “ready” means first usable on the prediction path, not merely present in an upstream file.

| Row | Merchant | Event | Ready | Value |
| --- | :------- | :---- | :---- | ----: |
| F01 | A        | 09:00 | 09:02 |    40 |
| F02 | A        | 09:30 | 10:20 |    70 |
| F03 | A        | 09:45 | 09:47 |    50 |
| F04 | A        | 09:45 | 10:10 |    65 |
| F05 | A        | 10:05 | 10:06 |    90 |
| F06 | B        | 09:58 | 09:59 |   999 |
| F07 | A        | 08:00 | 08:01 |    20 |

For merchant A at **10:00**, with maximum age **60 minutes**, F01 and F03 are eligible. F02 and F04 are unavailable then; F05 describes a future snapshot; F06 belongs to another merchant; F07 is too old. Select **F03 = 50**, whose event age is **15 minutes**.

F04 is a later correction to F03's 09:45 snapshot. An event-time-only join that chooses the latest retained correction returns **65**. A latest-in-archive lookup returns **90**, ignoring the historical cutoff altogether. Neither reproduces this replay policy's value of 50.

![Seven fictional feature snapshots are checked against merchant A, a ten-o'clock cutoff, and a sixty-minute age limit. F03 is selected with value fifty; event-time-only retrieval returns the later correction sixty-five, while the latest archive snapshot gives ninety.](../assets/machine-learning/point-in-time-feature-retrieval.svg 'Compare event time with ready time before selecting a row. F03 was usable at the decision; its later correction was not. The same archive gives different answers under different retrieval policies.')

The explorer computes the candidate filters, exclusion reasons, ranking, and all three retrieval results from the records. It changes the decision time, entity, age limit, or F02's arrival. These are original teaching calculations, not a feature-store benchmark or a model-accuracy experiment.

```patternverse-widget
{
  "src": "ml-point-in-time-feature-retrieval.html",
  "title": "Point-in-time feature retrieval explorer",
  "height": 1200,
  "fallback": "For merchant A at 10:00, replay selects the available value 50. Event-only retrieval returns a later correction, 65; latest-in-archive returns 90. Tight freshness limits can correctly leave a missing value."
}
```

### A late arrival is not retroactive knowledge

Move the decision to **09:40**. F02's event timestamp is earlier, but its original 10:20 availability is later. Historical replay therefore selects **F01 = 40**, age **40 minutes**, rather than F02's 70.

In the explorer's alternate scenario, F02 arrives at **09:35**. It now qualifies at 09:40 and supplies **70**, age **10 minutes**. Event-time-only retrieval does not change: it ignored availability in both scenarios. Likewise, F04's correction cannot replace F03 for a 10:00 replay just because the archive is queried after 10:10.

This distinction appears in a verified implementation: [Feast's current documentation](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) states that default historical joins constrain event timestamps; created timestamps otherwise deduplicate versions. Its optional `filter_by_created_timestamp=True` adds a per-decision created-time cutoff. The created column must reflect the availability being modeled. [Feast's offline-store interface](https://github.com/feast-dev/feast/blob/master/sdk/python/feast/infra/offline_stores/offline_store.py) makes support explicit; verify the installed version and backend rather than assuming every store supports the option.

### Freshness can produce a legitimate missing value

Return to 10:00 and reduce maximum age to **10 minutes**. F03's age is 15, so it is stale; no available A snapshot qualifies. The result is **null**, not zero orders. At a **15-minute** limit, F03 qualifies exactly on the boundary. Merchant C, which has no history, remains a decision row with a missing feature too.

[Databricks documents](https://docs.databricks.com/aws/en/machine-learning/feature-store/time-series) time-series feature lookups and a configurable lookback window. Its documented online behavior differs from historical lookback behavior, illustrating why training freshness rules must be checked against actual serving rules. An age limit is a consumer policy, not proof that an older value is intrinsically false.

## Assumptions for correctness

Keys, timestamps, timezones, and timestamp meanings must be trustworthy. The explorer assumes non-null clocks on one UTC date and a retained version history. Duplicate key/event/ready/revision combinations are rejected rather than resolved by input order.

Availability must include relevant computation and publication delays. A warehouse ingestion timestamp can precede online publication. [Apache Beam's guide](https://beam.apache.org/documentation/programming-guide/#watermarks-and-late-data) explains why event time and processing progress differ; a watermark alone is not evidence that a specific feature version was servable.

For aggregates, the snapshot's contents must also obey the intended cutoff. Attaching an old timestamp to a counter computed from future events does not remove leakage.

## When to use it

Use this pattern when training or backtesting decisions against features that change over time: demand forecasts, recommendations, or operational triage. It is especially valuable with delayed sources, corrections, and periodic feature materialization.

For immutable attributes genuinely known before every decision, a temporal lookup may add little. Document that assumption rather than treating all attributes as timeless by default.

## Tradeoffs and operating costs

Version retention, joins, and per-feature age policies consume storage, computation, and maintenance. Partitioning and indexes help retrieval, but pruning must still retain all candidates required by each decision.

Preserve feature definitions and source versions alongside datasets. Overwriting corrected rows can destroy the evidence needed for replay. Missingness may increase when realistic publication delays are enforced; that exposes an operating condition the model must handle.

## Common mistakes and limitations

Do not use the query's current time as every row's cutoff, substitute label-arrival time for decision time, or apply availability filtering after global deduplication. Do not silently drop decisions with missing matches.

Historical retrieval does not prove that a live server used that value: caches, outages, overwrite policies, and fallbacks may differ. Exact execution audits need serving logs. A point-in-time join also does not fix label leakage inside feature computation or a flawed evaluation split.

## Related patterns

[[ml-feature-store|Feature Store]] organizes shared feature definitions and retrieval paths; historical eligibility still needs explicit rules. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] governs the broader information boundary; temporal retrieval implements one part of it. [[ml-schema-based-data-validation|Schema-Based Data Validation]] checks keys and timestamp structure, but cannot establish their truthful meaning. [[ml-training-serving-consistency|Training–Serving Consistency]] aligns transformations and operational lookup rules. **Dataset Versioning** preserves a reproducible input artifact; selecting a storage snapshot alone does not apply a separate historical cutoff to each decision.

## Sources and further reading

- [Feast: point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) — per-row cutoffs, age limits, and optional created-time filtering.
- [Feast: offline-store interface](https://github.com/feast-dev/feast/blob/master/sdk/python/feast/infra/offline_stores/offline_store.py) — explicit support for the created-time cutoff option.
- [Databricks: point-in-time feature joins](https://docs.databricks.com/aws/en/machine-learning/feature-store/time-series) — time-series keys, missing matches, lookback windows, and serving differences.
- [DuckDB: ASOF joins](https://duckdb.org/docs/stable/guides/sql_features/asof_join) — temporal matching and retaining unmatched left rows.
- [Apache Beam: watermarks and late data](https://beam.apache.org/documentation/programming-guide/#watermarks-and-late-data) — event time, processing time, and delayed arrival.
