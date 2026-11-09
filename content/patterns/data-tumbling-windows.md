---
id: data-tumbling-windows
type: pattern
title: Tumbling Windows
summary: "Divide time into fixed, adjacent, nonoverlapping windows so each event timestamp belongs to one interval under an explicit boundary convention."
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

An operations dashboard needs a stable answer to a simple question: how many purchases happened in each five-minute period?

A running total never closes. A “last five minutes” calculation changes continuously and overlaps its previous result. Grouping whatever arrived during each scheduled job makes the answer depend on delays and restarts.

**Tumbling Windows divide time into fixed-size, adjacent intervals that do not overlap.** Within one window definition, each timestamp belongs to exactly one interval. Records can then be counted, summed, or otherwise summarized by window and business key.

The pattern provides a stable unit of temporal aggregation: these events belong to this interval.

## Partition time using a shared alignment

A tumbling-window definition needs a duration, an alignment, a timestamp field, and an endpoint convention.

For five-minute windows aligned to the hour, the intervals might be:

| Window | Membership |
|---|---|
| `[10:00, 10:05)` | At or after 10:00, before 10:05 |
| `[10:05, 10:10)` | At or after 10:05, before 10:10 |
| `[10:10, 10:15)` | At or after 10:10, before 10:15 |

The brackets matter. Under this convention, an event at exactly 10:05 belongs to the second interval. Apache Beam calls these **fixed time windows** and documents the same start-inclusive, end-exclusive behavior. [Apache Beam programming guide](https://beam.apache.org/documentation/programming-guide/#windowing)

Alignment matters too. Five-minute windows beginning at 10:00 produce different groups from five-minute windows beginning at 10:02. Producers and consumers comparing results need the same definition.

The timestamp determines what the summary describes. Event-time windows group business occurrences; processing-time windows group activity according to the processor’s clock. Both can be useful, but they answer different questions.

![Three adjacent five-minute windows contain distinct sets of events. An event exactly at 10:05 belongs to the second window. A delayed event timestamped 10:08 revises that same window if accepted.](../assets/data-engineering/tumbling-windows.svg "Five-minute UTC windows assign events at 10:01 and 10:04:59 to [10:00, 10:05), events at 10:05 and 10:08 to [10:05, 10:10), and an event at 10:12 to [10:10, 10:15). Processing delay does not move membership.")

## Five-minute purchase totals

Consider these illustrative purchases, all in UTC and the same currency:

| Event | Purchase time | Amount |
|---|---|---:|
| E1 | 10:01:00 | 30 |
| E2 | 10:04:59 | 70 |
| E3 | 10:05:00 | 20 |
| E4 | 10:08:00 | 40 |
| E5 | 10:12:00 | 50 |

The resulting totals are `100`, `60`, and `50`.

The boundary event E3 belongs wholly to the second window. It is neither duplicated across neighboring intervals nor omitted between them.

Apache Flink provides a documented SQL implementation through its `TUMBLE` table-valued function. For purchases grouped by store and currency:

```sql
SELECT
  store_id,
  currency,
  window_start,
  window_end,
  SUM(amount) AS purchase_amount
FROM TUMBLE(
  TABLE purchases,
  DESCRIPTOR(occurred_at),
  INTERVAL '5' MINUTES
)
GROUP BY store_id, currency, window_start, window_end;
```

In streaming use, `occurred_at` must be configured as an appropriate time attribute. Flink’s function assigns window boundaries, and the aggregation produces one result per grouping combination. [Apache Flink windowing documentation](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/sql/reference/queries/window-tvf/)

The output grain is therefore **one store, one currency, one five-minute interval**. Omitting currency would combine amounts that may not be meaningfully additive. Omitting the store changes the question to a platform-wide total.

## A closed interval does not guarantee a final answer

Suppose E4 occurred at 10:08 but is processed at 10:13.

Its event-time membership remains `[10:05, 10:10)`. Whether the pipeline incorporates it depends on its progress, retained state, and late-data policy.

A window implementation that retains state and supports late updates might first publish `20`, then revise that total to `60`. An implementation that has retired the window may route E4 to a correction workflow or exclude it under a documented policy.

Window assignment, result emission, and state retirement are separate decisions. Beam’s model explicitly separates windows from triggers and allowed lateness. [Apache Beam programming guide](https://beam.apache.org/documentation/programming-guide/#triggers)

The sink must understand revisions. A replacement total of `60` should update the existing window result, rather than be added to the earlier `20`. A delta contract could instead publish the additional `40`.

Likewise, a five-minute event-time window does not promise output precisely five wall-clock minutes later. Watermark progress, processing backlog, and emission policy affect when results become available.

## Request metrics need components that survive rollup

A service publishes request latency for consecutive five-minute windows:

| Window | Requests | Total latency | Mean latency |
|---|---:|---:|---:|
| 10:00–10:05 | 100 | 10,000 ms | 100 ms |
| 10:05–10:10 | 10 | 10,000 ms | 1,000 ms |

The ten-minute mean is approximately `181.8 ms`: total latency of `20,000 ms` divided by `110` requests.

Averaging the two published means gives `550 ms`, incorrectly treating the two windows as equally populated.

Tumbling windows make time partitions disjoint, but they do not make every measure additive. Store request counts and latency sums when larger summaries need weighted means. Distinct-user counts also cannot generally be added across windows because the same person may appear in several intervals.

This example reveals another limitation: fixed boundaries can conceal bursts. One hundred requests immediately before a boundary and another hundred immediately afterward occupy separate windows, even though they arrive within seconds of one another. A requirement concerning *any rolling five-minute period* calls for a different window definition.

## Endpoint conventions are part of the contract

Do not infer boundary behavior from the word “tumbling.”

Azure Stream Analytics documents the same fixed-size, contiguous, non-overlapping structure, but its default windows exclude the start and include the end. Its offset parameter can change that behavior. Consequently, an event exactly on a boundary can be assigned differently from the convention used in this article. [Azure Stream Analytics tumbling-window reference](https://learn.microsoft.com/en-us/stream-analytics-query/tumbling-window-azure-stream-analytics)

Verification should include events exactly at the start, exactly at the end, and immediately around both boundaries using the source’s actual timestamp precision.

The output timestamp also needs interpretation. A result labeled 10:05 may summarize the interval ending at 10:05. Persisting explicit start and end fields makes that meaning easier to inspect and join.

## Keep elapsed time distinct from calendar time

A fixed twenty-four-hour window is a duration. A local calendar day is defined by a timezone and successive local midnights.

During daylight-saving transitions, those midnights can be twenty-three or twenty-five elapsed hours apart. PostgreSQL’s documentation illustrates why adding one calendar day can differ from adding twenty-four hours. [PostgreSQL date/time documentation](https://www.postgresql.org/docs/current/functions-datetime.html)

For “sales per local business day,” use a calendar-aware definition with the intended timezone. For “measurements per elapsed hour,” fixed-duration windows may be appropriate.

A constant alignment offset can shift interval boundaries, but it does not automatically encode changing timezone rules.

## Account for missing intervals and operating costs

Tumbling windows are useful for regular reporting periods, fixed-interval telemetry, reconciliation, and compact aggregate datasets. Their stable boundaries also make partition replacement and historical comparison straightforward.

They commonly require less overlapping computation than hopping windows of the same duration. Actual cost still depends on the number of keys, retained windows, aggregate state, and accepted lateness. A sum can use a small accumulator; exact distinct sets or retained raw records can consume much more memory.

Smaller windows create more output records and more boundary-sensitive results. Larger windows smooth variation but delay complete interval summaries and can hide short incidents.

An empty interval may produce no row unless the system explicitly generates one. Absence can mean zero activity, missing input, or an unprocessed interval. Reporting zeros requires a known interval scaffold and an explicit completeness policy.

Finally, one-window membership does not deduplicate repeated delivery. The same event delivered twice can still be counted twice within its assigned window.

## Related patterns

[[data-event-time-processing|Event-Time Processing]] determines which business timestamp drives membership and how delayed arrivals are handled.

[[data-half-open-time-intervals|Half-Open Time Intervals]] provides a precise convention for assigning boundary timestamps.

[[data-store-additive-components|Store Additive Components]] preserves the sums and counts needed to combine window results correctly.

[[data-partition-replacement|Partition Replacement]] can publish a complete recomputed window when corrections arrive.
