---
id: data-secondary-access-paths
type: pattern
title: Secondary Access Paths
summary: "Maintain additional query-oriented routes to authoritative records, accelerating important lookups while defining how each route stays current and handles stale or missing candidates."
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

An orders table is organized for retrieving an order by its identifier. Then support needs a customer’s recent orders, operations needs the oldest open orders, and a search interface needs phrases from delivery instructions.

One storage organization cannot serve all these requests efficiently. Scanning the entire dataset for every alternate question makes the live system increasingly expensive.

**Maintain additional structures organized around important queries, while keeping an explicit relationship to the authoritative records.**

A secondary access path might be an ordered index, an alternate-key projection, a search index, or a materialized serving view. It offers another way to locate or read the same underlying information.

The benefit is faster retrieval. The obligation is maintaining that additional representation as records change—and defining what readers may trust while maintenance is incomplete.

## Give another query its own organization

A primary access path might answer “find order O71.” A secondary path could organize entries as:

| Access path | Organization | Supported question |
|---|---|---|
| Customer history | Customer → creation time → order | What did this customer order recently? |
| Open-order queue | Tenant → creation time, restricted to open orders | Which open orders should be considered first? |
| Text search | Search terms → matching documents | Which instructions mention a parcel locker? |

Some structures contain record identifiers and require a source lookup. Others include projected fields sufficient to answer the query directly.

That choice affects storage, read amplification, and staleness. A larger projection can avoid additional reads, but every copied field becomes another value to maintain.

A secondary path is useful when a recurring query justifies that maintenance cost. Creating one for every imaginable filter moves complexity into the write path.

![Authoritative orders show O71 shipped at version 19 and O72 open. A native transactional index finds O72 as open, while an asynchronous search projection may still return O71 at its older open version. Source checks can remove stale matches but cannot find records missing from a lagging projection.](../assets/data-engineering/secondary-access-paths.svg "A native index reflects O72 open v5. An asynchronous projection still says O71 open v18 although the source is shipped v19. Rechecking can remove stale positives but cannot recover matches missing from the projection.")

## Example: an ordered path for open orders

A PostgreSQL application frequently requests the oldest open orders for one tenant.

An illustrative partial index follows that access pattern:

```sql
CREATE INDEX orders_open_by_tenant_time
ON orders (tenant_id, created_at, order_id)
INCLUDE (amount)
WHERE status = 'open';
```

The index groups eligible entries by tenant and time. The order identifier provides a stable tie-breaker, while `amount` is available as an included value.

PostgreSQL partial indexes contain only rows satisfying their predicate. Queries must have conditions the planner can recognize as implying that predicate; an index restricted to open orders cannot answer an unrestricted order-history query. [PostgreSQL: Partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)

Including fields can make an index-only scan possible, but does not guarantee one. PostgreSQL must also establish row visibility, and recently modified heap pages can still require table access. This matters particularly for a busy live table. [PostgreSQL: Index-only scans and covering indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)

The database maintains this index with its table changes, and queries follow the database’s snapshot rules.

Finding an open order still does not reserve it. A worker acting on the result needs an appropriate transaction or conditional update because another worker may change the order after selection.

## Example: customer history from an order-keyed store

A DynamoDB table uses `order_id` as its primary lookup key. Applications also need each customer’s orders in creation-time order.

A global secondary index can use `customer_id` as its partition key and an ordered creation-time key as its sort key, with selected order attributes projected into the index.

AWS documents global secondary indexes as alternate organizations of base-table attributes, automatically maintained by DynamoDB. Their keys can differ from those of the base table. [DynamoDB: Global secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)

This makes customer history queryable without scanning all orders.

The consistency contract differs from the PostgreSQL example. DynamoDB propagates base-table changes to global secondary indexes asynchronously, and GSI reads are eventually consistent. A successful base-table write does not establish that a subsequent GSI query will immediately include it. [DynamoDB: Read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)

For a newly created order, an application that knows its identifier can retrieve it through a suitable base-table read rather than depending on immediate discovery through customer history.

The index is also part of capacity planning. AWS documents additional write costs and potential base-table throttling when a provisioned GSI lacks sufficient write capacity. An alternate read path can therefore affect write availability. [DynamoDB: GSI synchronization and capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)

## Example: search delivery instructions

An order service needs full-text search over delivery instructions. Its authoritative records remain in the transactional database, while a projection is indexed into Elasticsearch.

Each search document carries the order identity and relevant source version. A reliable change-delivery mechanism updates the projection as orders change.

There are several distinct delays: the database change must be captured, delivered, indexed, and made visible to search.

Elasticsearch uses refreshes to expose indexed changes to searches. Its `refresh=wait_for` option waits for the changes in that indexing request to become search-visible before replying. It does not wait for an unrelated source-database change that has not reached Elasticsearch yet. [Elasticsearch: Refresh parameter](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/refresh-parameter)

Forcing a refresh after every document can increase indexing, search, and merge overhead. Visibility policy should follow the interaction’s freshness requirement, rather than treating every write as needing immediate search discovery.

The projection also needs safe retries, source-version handling, and deletion propagation. An old update arriving after a newer one must not restore obsolete state.

## Distinguish stale matches from missing matches

Suppose O71 changes from open to shipped, but an asynchronous index still lists it as open.

Reading O71 from the source can expose the stale match. A conditional action can refuse to process it as open.

Now suppose O72 has just become open but has not reached the index. Rechecking returned identifiers cannot discover O72 because the index never returned it.

This distinction determines what the path can support:

- A discovery interface may tolerate temporary omissions.
- A workflow can validate candidates before acting.
- A completeness-sensitive operation needs a sufficiently current access path or a protocol that establishes coverage.

Repeated source reads also do not automatically provide one coherent snapshot across the entire result set.

An asynchronous index is unsuitable for enforcing an invariant merely by checking that a value is absent. Uniqueness and other critical conditions need authoritative enforcement appropriate to the system.

## Treat maintenance as a processing pipeline

For an external projection, separately writing the database and the index creates a failure gap: either write can succeed while the other fails.

Change data capture or a transactional outbox can preserve a recoverable stream of source changes. The projection consumer then needs stable identities, idempotent application, ordering or version checks, and explicit tombstones for deletions.

Building a new path over existing data requires more than copying a snapshot. Changes occurring during the build must be captured and reconciled before readers switch.

Validate representative results, lag, and coverage. A completed backfill does not prove that the new path has caught up with live writes.

Record enough progress to replay missed changes and rebuild the structure. A derived path is operationally safer when its contents can be reconstructed from retained authoritative data.

## Budget for the whole access portfolio

Secondary structures consume storage, cache, write capacity, and maintenance work. Covering indexes duplicate values; text indexes expand terms; asynchronous projections add delivery and recovery infrastructure.

They can also concentrate load around popular keys. An index partitioned only by a low-cardinality status may turn a useful query into a hotspot.

Measure query latency and read work alongside write latency, projection lag, maintenance backlog, and failure recovery. Remove paths that no longer justify their costs.

For small datasets or infrequent exploratory queries, scanning may remain simpler. Several incompatible high-volume queries may justify separate serving structures, provided each has an explicit consistency contract.

[[data-partition-by-access-pattern|Partition by Access Pattern]] shapes the primary layout. [[data-transactional-outbox|Transactional Outbox]] supplies recoverable change delivery. [[data-idempotent-writes|Idempotent Writes]] makes projection retries safer. [[data-freshness-monitoring|Freshness Monitoring]] checks whether a maintained path remains current enough for its users.

A secondary access path earns its place when it makes an important query efficient and its maintenance contract remains strong enough for the decisions made from its results.
