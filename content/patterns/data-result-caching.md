---
id: data-result-caching
type: pattern
title: Result Caching
summary: "Reuse a computed answer only when its data version, query meaning, parameters, access scope, and freshness still satisfy the new request."
status: published
aliases: []
tags:
  - data-engineering
  - storage-access
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A dashboard refreshes every thirty seconds. Each refresh runs the same expensive aggregation over the same published dataset. Hundreds of users ask for the same answer, and the warehouse repeatedly performs work whose result has not changed.

**Result Caching stores a computed answer and reuses it for subsequent requests when that answer still satisfies the request’s data, meaning, access, and freshness requirements.**

The purpose is to reduce repeated computation, response time, and load. The difficult part is deciding when two requests are equivalent—and when a previously correct answer has stopped being acceptable.

## Cache an answer with its conditions

A result cache might hold a scalar metric, a table of query results, or a serialized dashboard response.

On a cache hit, the system returns the stored answer. On a miss, it computes the answer and may store it for reuse. Microsoft’s cache-aside pattern describes this application-managed sequence: check the cache, retrieve missing data from the underlying store, then populate the cache. It also notes that cache-aside alone does not guarantee consistency with that store. [Azure cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)

Correct reuse requires more than matching a report name. Relevant conditions can include:

- Query or metric definition and its version.
- Parameters, filters, date boundaries, timezone, and currency.
- Tenant and effective access scope.
- Source dataset version or another freshness condition.

A request for “yesterday’s revenue” is incomplete until “yesterday” has concrete boundaries. A change to the revenue definition can invalidate a result even when the underlying transactions remain unchanged.

![Result caching using a complete request context and pinned source versions. A result of USD 100 computed from version 42 is reused for matching version 42 requests. Publishing version 43 changes the cache identity, causing a miss and a new computation of USD 110. A late version 42 computation cannot overwrite the version 43 entry.](../assets/data-engineering/result-caching.svg "The cache key includes tenant 7, date October 25, metric logic m2, access scope p3, and snapshot v42. Snapshot v43 uses a new key for result 110, so an old v42 fill of 100 cannot replace it.")

*In this application design, the source version belongs in the cache identity, and the computation actually reads that version.*

## Example: repeated warehouse queries

An analyst runs a BigQuery query that totals yesterday’s sales by product. A colleague’s dashboard submits the same query again.

BigQuery can reuse cached results for eligible repeated queries. Its matching rules require identical query text; even whitespace or comment changes can prevent reuse. Changes to referenced tables or logical views, recently streamed data, and nondeterministic functions are among the documented exceptions. [BigQuery cached results](https://docs.cloud.google.com/bigquery/docs/cached-results)

This is valuable for repeated reporting against stable data. It is less predictable for a dashboard whose generated SQL changes on every refresh or whose inputs receive continuous updates.

BigQuery exposes `statistics.query.cacheHit` so operators can verify reuse. A fast response alone is insufficient evidence: a query might instead benefit from other optimizations.

Its approximately twenty-four-hour cache retention is a storage behavior, not permission to return yesterday’s answer after relevant data changes. Native eligibility rules determine whether reuse applies.

## Example: distinguish result reuse from faster execution

A team tests a Snowflake reporting query twice. The second execution is much faster, so they conclude that their SQL rewrite improved performance.

That conclusion may be wrong.

Snowflake’s persisted query results can bypass query execution when reuse conditions are satisfied. Those conditions include matching query text, unchanged contributing data, appropriate privileges, and unchanged settings that affect the result. Changes to relevant micro-partitions, including reclustering, can prevent reuse. Snowflake explicitly states that meeting its listed conditions does not guarantee reuse. [Snowflake persisted query results](https://docs.snowflake.com/en/user-guide/querying-persisted-results)

Snowflake also distinguishes persisted results from the warehouse cache of table data. Reading cached input blocks still involves executing the query; retrieving a completed result avoids that computation.

Benchmark with the intended cache settings and inspect execution evidence. Measure both repeated requests and requests that require computation. A system sized only for warm hits can struggle after expiration, deployment, or cache loss.

## Example: cache against published dataset versions

A reporting service calculates revenue for tenant T7 over October 25 UTC, using metric definition `m2` and access scope `p3`.

Against published dataset version `v42`, the answer is USD 100. The service stores that result under an identity containing all those conditions.

A corrected dataset, `v43`, produces USD 110:

| Request context | Dataset | Cache behavior | Answer |
|---|---|---|---:|
| T7, October 25 UTC, m2, p3 | v42 | Compute and store | USD 100 |
| Same context | v42 | Reuse | USD 100 |
| Same context | v43 | Compute and store separately | USD 110 |

The service must pin the computation to the version named in the key. Reading a version label and then querying mutable “latest” tables can store one version’s answer under another version’s identity.

Versioned entries also address a common race. A slow computation starts against v42. Meanwhile, v43 is published. The old computation finishes later.

If both write the same cache entry, the older answer can replace the newer one. Separate version identities prevent that overwrite, provided the underlying snapshots remain stable.

For mutable sources without accessible versions, invalidation and cache filling need a concurrency protocol. Deleting an entry after a write does not, by itself, prevent an older in-flight reader from repopulating it.

## Expiration is not a freshness guarantee

A time-to-live controls how long an entry remains eligible under the cache’s policy. It does not establish how current the original computation was.

Suppose a report reads a replica already eight minutes behind the source. Caching its answer for another two minutes does not create a two-minute freshness guarantee.

Query duration, ingestion delay, replica lag, refresh scheduling, and cache residence can all contribute to the age of the answer. Store the relevant source boundary and computation time, and expose an intelligible “as of” value when it matters.

Choose a freshness contract deliberately. A historical report may reuse an immutable version indefinitely while that version remains requested. A live operational view may require frequent refreshes or bypass the cache after a user’s write.

If stale results are permitted during refresh or an outage, define the allowed grace period. Never turn a failed refresh into a cached zero or empty result: “could not calculate” and “nothing happened” mean different things.

## Authorization belongs on the hit path

An application cache must enforce the caller’s current authorization before serving a stored result. Include effective access scope in the identity wherever it changes the answer; a tenant identifier alone may not capture row-level entitlements.

A cache hit must not bypass permission changes merely because the database is no longer queried.

Managed services have their own rules. BigQuery documents circumstances in which previously cached column-protected results remain accessible after certain permission removals. Verify the relevant service behavior rather than assuming immediate revocation invalidates every cached copy. [BigQuery security and cached results](https://docs.cloud.google.com/bigquery/docs/cached-results#impact_of_column-level_security)

## Prevent a miss from becoming a stampede

When a popular entry expires, hundreds of callers can simultaneously recompute it. The resulting load spike can overwhelm the dependency the cache normally protects.

Coalesce concurrent requests for the same complete cache identity. Go’s `singleflight` package provides one implementation: callers sharing a key within a `Group` wait for one in-flight function execution and receive its result. Coordination is scoped to that group; it does not automatically coordinate an entire service fleet. [Go singleflight documentation](https://pkg.go.dev/golang.org/x/sync/singleflight)

Use bounded waiting, refresh concurrency limits, and an explicit failure policy. Staggering expirations can spread refresh load across different entries, but it does not stop simultaneous misses for one hot key.

## Where the savings outweigh the machinery

Result caching works best when expensive answers repeat more often than their validity conditions change. Stable reporting, shared dashboard queries, and bounded historical analyses are strong candidates.

Costs include cache storage, serialization, network transfer, invalidation work, refresh coordination, and operational complexity. Large results with little reuse may cost more to store and retrieve than they save. Highly personalized requests can fragment the cache into entries that rarely receive a second hit.

Measure hit and miss latency, computation avoided, entry sizes, refresh failures, and source load during cold periods. Keep durable pipeline dependencies in managed datasets rather than relying on an evictable result cache.

[[data-materialized-views|Materialized Views]] maintains reusable derived data beyond an individual response. [[data-deterministic-transformations|Deterministic Transformations]] makes equivalent inputs produce equivalent answers. [[data-atomic-publication|Atomic Publication]] supplies stable dataset versions. [[data-freshness-monitoring|Freshness Monitoring]] checks whether fast answers remain timely enough to use.
