---
id: data-state-expiration
type: pattern
title: State Expiration
summary: "Remove working state when its defined retention or correctness horizon ends, bounding resource use while making the resulting limits explicit."
status: published
aliases: []
tags:
  - data-engineering
  - streaming-event-processing
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A streaming job starts with a small collection of counters, unmatched records, and remembered event IDs. Months later, its state occupies hundreds of gigabytes. Checkpoints take longer, recovery slows, and storage keeps growing—even though most of that history no longer contributes to current results.

State Expiration gives working state a defined lifetime. It removes information once the computation no longer needs it, or once an explicitly bounded guarantee ends.

The challenge is deciding what “no longer needs it” means. Deleting a counter, a deduplication marker, or an unmatched order changes what the pipeline can do next.

## Every piece of state needs a reason to stay

State is information retained between records: a running total, a partially assembled session, an event ID already processed, or one side of a join waiting for its partner.

A useful expiration rule connects four things:

| Decision | What it establishes |
|---|---|
| State purpose | Which future operations depend on this information |
| Expiration condition | When that dependency ends |
| Clock or progress signal | How the system determines that the condition has been reached |
| Behavior afterward | What happens if another relevant record arrives |

There are two broad foundations for expiration.

One is **a bounded processing contract**: remember event IDs for ten minutes, or treat a device as inactive after thirty minutes without an update.

The other is **progress through a bounded computation**: retain a window until its accepted correction period ends, or retain a join record until no further accepted partner can match it.

These foundations may use different clocks. A processing-time timeout follows the processor’s clock. Event-time cleanup follows progress through timestamps in the data, usually represented by watermarks. Ten minutes of one is not necessarily ten minutes of the other.

![Window state is retained while corrections remain acceptable, expires after its configured watermark horizon, and has its stored bytes reclaimed by cleanup. Logical expiry and physical deletion can occur at different times.](../assets/data-engineering/state-expiration.svg "For window [10:00,10:05) with ten minutes of allowed lateness, state exists at watermark 10:12 and is expired after the cleanup boundary at watermark 10:16. Physical reclamation and result retention are separate concerns.")

## Example: retiring a window after corrections close

A sales computation maintains a total for the event-time window `[10:00, 10:05)`. It permits ten minutes of allowed lateness.

When the watermark passes the window’s end, the computation may publish an initial result. It still needs the aggregate state because an accepted late purchase could change that result.

At watermark 10:12, a purchase timestamped 10:03 can still contribute. Once the watermark has passed the cleanup horizon near 10:15, the window can be removed under this policy. Exact boundary comparisons depend on the engine’s timestamp conventions.

Flink’s event-time windows implement this lifecycle: window state remains available during allowed lateness and is removed when that period expires. Late records can also be directed to a side output for separate handling. [Flink window lifecycle and allowed lateness](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/operators/windows/#allowed-lateness)

Removing the working aggregate does not delete the published sales result. Those are different objects with different lifetimes.

Nor does expiration prevent an older purchase from arriving tomorrow. It establishes that the live computation will no longer revise that window through its ordinary path. Reconciliation or historical restatement may still handle the purchase.

Kafka Streams makes a related requirement explicit: window-store retention must cover the window’s entire lifecycle, including its grace period. Storage cannot safely disappear before the operator finishes using it. [Kafka Streams window-store retention](https://kafka.apache.org/42/javadoc/org/apache/kafka/streams/state/Stores.html)

## Example: forgetting a deduplication marker

A consumer remembers event IDs to suppress retries. Consider a custom policy that retains each marker for ten processing-time minutes from its first insertion, without refreshing it on duplicate reads:

| Processing time | Arrival | Outcome |
|---|---|---|
| 10:00 | First copy of E901 | Process; store marker |
| 10:06 | Retry of E901 | Suppress; retain original deadline |
| 10:10 | Marker reaches expiration | Treat marker as absent |
| 10:12 | Another copy of E901 | May process again |

The state remains bounded, but the duplicate-protection guarantee is bounded too.

If the source can replay records from yesterday, ten minutes of remembered IDs cannot provide protection across that replay horizon. The design may need longer retention, durable uniqueness at the destination, or another idempotency mechanism.

Refreshing the deadline changes the policy. Expiration ten minutes after first observation differs from expiration ten minutes after the most recent access. Frequent duplicate reads could keep a marker alive indefinitely under an access-refresh rule.

Flink’s keyed-state TTL exposes this distinction through refresh-on-create-and-write or refresh-on-read-and-write settings. Its documented TTL mechanism uses processing time, so it should not be mistaken for event-time window cleanup. [Flink state TTL](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/fault-tolerance/state/#state-time-to-live-ttl)

Processing time also advances during downtime. A marker that was valid before a long outage may be expired when processing resumes.

## Example: releasing an unmatched order

A join matches an order with shipments occurring from the order’s event time through four hours afterward.

Order O42 occurred at 10:00. Its latest eligible shipment timestamp is 14:00.

Deleting the order merely because four wall-clock hours have passed is unsafe if shipment processing is delayed. A shipment timestamped 13:50 may still be waiting upstream.

Instead, cleanup follows the join’s event-time bounds and effective progress. Once the configured lateness policy excludes any further accepted shipment at 14:00 or earlier, the buffered order no longer needs to remain available for future matches.

The reverse side needs its own reasoning: shipment state is retained according to which orders could still match it.

Spark Structured Streaming documents watermark delays together with event-time constraints as the basis for bounding stream-stream join state. For outer joins, that progress also determines when an unmatched result can be produced. [Spark stream-stream joins](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#stream-stream-joins)

A generic “delete everything older than four hours” setting loses these dependencies. The business matching horizon and the allowance for delayed arrival serve different purposes.

## Expired does not necessarily mean physically gone

Logical expiration determines whether state participates in computation. Physical cleanup reclaims its storage.

Those moments can differ. A backend may recognize expiration during a read, scan entries incrementally, or remove expired values during storage compaction.

Flink makes visibility configurable: expired values can be hidden immediately from state reads even while their bytes await cleanup. Its cleanup strategies depend on the backend, and additional cleanup work can increase processing or compaction costs. [Flink expired-state cleanup](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/fault-tolerance/state/#cleanup-of-expired-state)

This distinction explains why configuring TTL may not immediately shrink a state directory.

It also means live-state cleanup is separate from retention of checkpoints, backups, raw inputs, and downstream results. Each needs its own lifecycle.

## Choose a lifetime the guarantee can support

Expiration is useful for finite windows, bounded joins, temporary correlations, and deduplication with an explicit replay horizon.

It cannot safely turn every computation into bounded state. A lifetime total per customer still depends on its previous total even after a year of inactivity. Deleting it resets the meaning of the result. A current reference record may remain valid despite receiving no updates.

Event-time expiration also depends on trustworthy timestamps and progress policies. A stalled watermark can retain state much longer than expected. Aggressive idle-input handling may permit progress, but resumed old data then needs a clear lateness policy.

Changing retention requires migration reasoning. Extending a ten-minute lifetime to an hour does not recreate entries already removed. Shortening it may immediately end guarantees that existing consumers relied on. Recovery must preserve a consistent relationship among input progress, state, and expiration behavior.

## The operating cost of remembering

As a rough sizing model, retaining 10,000 new markers per second for a fixed ten-minute lifetime produces about six million live markers at steady state. At 100 serialized bytes each, that is roughly 600 MB before indexing, timestamps, backend overhead, replication, and checkpoints.

Actual state can be larger because cleanup lags, traffic bursts, or refresh rules extend lifetimes.

Monitor live entries, physical storage, cleanup throughput, checkpoint duration, recovery time, and records arriving after expiration. For event-time state, monitor watermark progress as well. A retention setting alone does not establish a wall-clock storage bound.

The useful target is a lifetime justified by the computation and its recovery contract.

## Related patterns

[[data-watermarks|Watermarks]] provide event-time progress for cleanup decisions. [[data-allowed-lateness|Allowed Lateness]] defines how long a window remains open to accepted corrections.

[[data-stateful-stream-deduplication|Stateful Stream Deduplication]] uses retained identity markers whose expiration limits duplicate protection. **Bounded Stream-Stream Joins** supplies temporal constraints that make retained matching records eligible for removal.
