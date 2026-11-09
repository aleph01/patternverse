---
id: data-half-open-time-intervals
type: pattern
title: Half-Open Time Intervals
summary: "Include an interval’s start and exclude its end, so adjoining periods share a boundary without counting that instant twice."
status: published
aliases: []
tags:
  - data-engineering
  - time-history
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A sale arrives at exactly midnight on August 1. July’s report includes everything through August 1. August’s report includes everything from August 1. Both reports count the sale.

The same ambiguity appears when a subscription changes plans, an employee transfers departments, or one reservation begins as another ends. Two periods meet at the same timestamp, but the model does not say which period owns that instant.

[[data-half-open-time-intervals|Half-Open Time Intervals]] establishes a consistent boundary rule: include the start and exclude the end. Adjacent periods can then meet without counting their shared boundary twice.

## The end marks the next beginning

This pattern uses the notation **`[start, end)`**. The square bracket includes the starting value; the parenthesis excludes the ending value.

A timestamp belongs to the interval when:

`start <= timestamp < end`

Strictly, “half-open” can also describe the reverse convention, `(start, end]`. The convention here is consistently start-inclusive and end-exclusive.

July can therefore run from July 1 at midnight up to, but excluding, August 1 at midnight. August begins at precisely that same instant. There is no gap between them, and no instant belongs to both.

![Timeline showing July excluding August 1 midnight and August including that same instant. Filled circles indicate included endpoints and hollow circles indicate excluded endpoints.](../assets/data-engineering/half-open-time-intervals.svg "July is [July 1, August 1); August is [August 1, September 1). A boundary event belongs to exactly one interval.")

The end describes where the period stops applying. It does not need to describe its “last possible moment.”

That distinction removes a fragile dependency on timestamp precision. An endpoint such as `23:59:59.999` assumes milliseconds are the finest values that matter. A system storing microseconds can contain later timestamps on the same day. Using the next boundary avoids inventing a final tick.

## Example: monthly reports that reconcile

Suppose an event table contains these illustrative sales:

| Sale | Event timestamp, UTC | Amount | Reporting month |
|---|---|---:|---|
| S-101 | 2026-07-31 23:59:59.999999 | 40 | July |
| S-102 | 2026-08-01 00:00:00 | 70 | August |
| S-103 | 2026-08-01 00:00:00.000001 | 25 | August |

July’s interval is `[2026-07-01, 2026-08-01)`. August’s is `[2026-08-01, 2026-09-01)`, with all boundaries interpreted as midnight UTC.

The filtering rule is short:

```sql
WHERE event_at >= :period_start
  AND event_at <  :next_period_start
```

July totals 40; August totals 95. Their combined total is 135, with the boundary sale counted once.

Ordinary SQL `BETWEEN` is a common source of mistakes because it includes both endpoints. Substituting it for the two comparisons changes the meaning of the interval. PostgreSQL documents this equivalence explicitly: `BETWEEN` uses `>=` and `<=`. [PostgreSQL comparison predicates](https://www.postgresql.org/docs/18/functions-comparison.html)

This makes half-open intervals useful for recurring reporting windows and processing batches. However, correct boundaries do not guarantee complete data. A July sale arriving in September still requires a late-data policy. Likewise, retries can duplicate records inside a perfectly defined interval.

## Example: a plan changes at midnight

A customer moves from Basic to Pro on August 1:

| Customer | Plan | Valid from, UTC | Valid until, exclusive, UTC |
|---|---|---|---|
| C-42 | Basic | 2026-07-01 00:00 | 2026-08-01 00:00 |
| C-42 | Pro | 2026-08-01 00:00 | 2026-09-01 00:00 |

An event at exactly August 1 midnight matches Pro. Basic has stopped applying.

The same boundary rule works for prices, account ownership, organizational assignments, and dimension versions. It also makes a handover easy to represent: the previous row’s end equals the next row’s start.

This convention appears in an actual database implementation. SQL Server’s system-versioned temporal tables evaluate `AS OF t` using `ValidFrom <= t AND ValidTo > t`. Its documented update behavior gives the old version’s end and the new version’s start the same transaction timestamp. [Microsoft temporal table documentation](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal/overview?view=sql-server-ver17)

The timeline’s meaning still matters. SQL Server system time records database history; a subscription’s effective dates describe business validity. Using the same endpoint convention does not make those timelines interchangeable.

## Example: reservations can touch without overlapping

A meeting room has two reservations:

| Reservation | Start | End, exclusive |
|---|---|---|
| R-10 | 10:00 | 11:00 |
| R-11 | 11:00 | 12:00 |

The reservations touch, but they do not overlap. At 11:00, the room belongs to R-11.

For two nonempty, bounded half-open intervals, overlap exists when:

`a_start < b_end AND b_start < a_end`

Notice the strict comparisons. Replacing either with an inclusive comparison can incorrectly classify a shared endpoint as an overlap.

PostgreSQL supports this model directly through range types. Range constructors default to `[)`, and its documentation demonstrates exclusion constraints that prevent overlapping reservations for the same room. Its `daterange` type also uses `[)` as its canonical representation; timestamp ranges can retain other boundary conventions, so applications should establish theirs explicitly. [PostgreSQL range types and exclusion constraints](https://www.postgresql.org/docs/18/rangetypes.html)

Physical requirements may change the reservation model. If a room needs ten minutes of cleaning, the occupied interval must include that turnaround time. Boundary notation cannot create a buffer that the data never represents.

## The assumptions that make it correct

The endpoints must belong to a compatible, ordered domain. Calendar dates, local timestamps, and globally identified instants carry different meanings. Comparisons require an explicit interpretation rather than accidental conversions.

A finite period intended to contain time requires `start < end`. The interval `[t, t)` is empty: including the start does not help when the same value is excluded by the end condition. An instantaneous occurrence is usually better represented as an event timestamp. The overlap formula above assumes nonempty intervals.

Open-ended periods need a separate convention. An absent end might mean “continues indefinitely,” “end not yet known,” or “source omitted the value.” Those meanings should not be silently combined. If a nullable end means unbounded, queries must handle that explicitly; an ordinary comparison against SQL `NULL` does not evaluate to true.

Finally, half-open boundaries do not enforce the shape of an entire history. Rows can still overlap or leave gaps. A model requiring exactly one active plan per customer needs rules scoped to that customer, enforced through constraints or checks and safe concurrent writes.

## Calendar boundaries need calendar rules

A report described as “July 1 through July 31” normally includes both named dates. Its internal date interval can still be `[July 1, August 1)`. The interface and storage model simply use different presentations of the same coverage.

For timestamp filtering, construct both boundaries in the intended business time zone, then compare compatible instants. A Berlin business day and a UTC day have different boundaries.

Nor is a local calendar day always 24 elapsed hours. Daylight-saving transitions can change its duration. PostgreSQL documents that adding one calendar day to a zoned timestamp can produce a different result from adding 24 hours. [PostgreSQL date and time arithmetic](https://www.postgresql.org/docs/18/functions-datetime.html)

The endpoint convention answers whether a boundary is included. Calendar and time-zone rules determine where that boundary falls.

## Costs, migration, and useful limits

The ongoing cost is maintaining one shared contract across writers, queries, APIs, and interfaces. Names such as `end_exclusive` help make that contract visible.

Migration requires care. A legacy end date of July 31 might mean “all of July 31”; a legacy timestamp might mean an exact stopping instant. Mechanically adding a day or subtracting a millisecond can change the intended coverage. Boundary cases deserve explicit verification, particularly the instant at which one period hands over to another.

Half-open intervals simplify predicates and reconciliation, but they do not guarantee faster queries. Storage layout, indexes, and database range support still determine execution costs. Constraints also add write-time work.

The pattern is especially useful wherever periods must compose: reporting calendars, effective-dated histories, reservations, and processing windows. Where an external contract requires inclusive endpoints, preserve that meaning and translate it deliberately at the system boundary.

## Related patterns

[[data-effective-dated-records|Effective-Dated Records]] gives business attributes periods of validity; half-open intervals make transitions unambiguous.

[[data-as-of-joins|As-of Joins]] select the state applicable at an event’s timestamp. Explicit end boundaries prevent a previous state from remaining eligible after it expires.

[[data-periodic-snapshots|Periodic Snapshots]] depend on consistent reporting cutoffs. Distinguishing the snapshot instant from the period it summarizes avoids boundary confusion.

[[data-bitemporal-records|Bitemporal Records]] track business validity and recorded history separately. Each timeline can use half-open intervals while retaining its own meaning.
