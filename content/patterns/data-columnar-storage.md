---
id: data-columnar-storage
type: pattern
title: Columnar Storage
summary: "Store values by column so analytical queries can read and compress the fields they need without routinely loading unrelated data."
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

A live analytics service ingests events containing timestamps, tenant identifiers, amounts, device attributes, and large diagnostic payloads. Its dashboard repeatedly asks for totals by tenant.

The query needs only a few fields, but a layout that brings complete records into each scan spends resources retrieving and decoding data the dashboard never uses.

**Store values from the same column together, so analytical queries can read and process the columns they need while avoiding unrelated fields.**

Columnar storage is especially useful when live data feeds repeated scans, filters, and aggregations over many records. Freshness depends on how the storage engine accepts writes and makes them queryable; the columnar layout itself does not prescribe a long delay.

The design challenge is to combine efficient analytical reads with an ingestion path that meets the required visibility and durability contract.

## Keep logical rows, reorganize physical values

A columnar table still has rows. The physical arrangement groups values by column within bounded storage units.

Apache Parquet, for example, organizes files into row groups. Each row group contains a column chunk for each column, and chunks contain pages used for encoding and compression. A column is not necessarily stored as one uninterrupted sequence covering the entire dataset. [Apache Parquet: Concepts](https://parquet.apache.org/docs/concepts/)

This arrangement provides three opportunities:

- **Projection:** Read required columns while avoiding others.
- **Compression:** Encode similar values and types efficiently.
- **Batch processing:** Evaluate filters and calculations over groups of values.

The benefits depend on the engine, data, and query. Choosing a columnar format does not guarantee a particular compression ratio or execution speed.

![The four logical records are shown with the tenant and amount columns selected. Tenant 7 matches positions 1, 3, and 4, whose amounts 20, 30, and 10 sum to 60. E2 has tenant 8 and amount 40, so it is excluded. Event IDs and payloads are not needed by this query.](../assets/data-engineering/columnar-storage.svg "For SUM(amount) WHERE tenant=7, read tenant and amount columns, not ID or payload. Matching positions 1, 3, 4 hold amounts 20, 30, 10 and sum to 60. Physical skipping depends on the storage engine.")

## Example: aggregate two columns from a wide event table

Within a selected day’s data, consider these illustrative records:

| Event | Tenant | Amount | Payload |
|---|---:|---:|---|
| E1 | 7 | 20 | Large diagnostic body |
| E2 | 8 | 40 | Large diagnostic body |
| E3 | 7 | 30 | Large diagnostic body |
| E4 | 7 | 10 | Large diagnostic body |

The analytical question is:

```sql
SELECT SUM(amount)
FROM events
WHERE tenant_id = 7;
```

The engine needs tenant values to identify matching positions and amount values to calculate the result: 60. Event identifiers and payloads are unnecessary for this query.

BigQuery explicitly recommends projecting only required columns because excess projection adds I/O and materialization. Its guidance also warns that adding `LIMIT` to `SELECT *` does not provide the same reduction in data read. [BigQuery: Control projection](https://docs.cloud.google.com/bigquery/docs/best-practices-performance-compute#avoid_select_)

Column count alone is a poor savings estimate. Avoiding one large payload column may matter more than avoiding several small numeric columns. Compression, metadata, caching, and indexes also affect actual I/O.

The advantage weakens when most queries fetch complete records individually. Those requests may need to reconstruct many attributes instead of scanning a few narrow value streams.

## Compression works with the values

Columns bring together values with similar representations: timestamps, identifiers, categories, or measurements.

Repeated categories can use dictionary encoding. Runs of repeated values can use run-length encoding. Suitable numeric sequences can use delta-based encodings. Parquet defines these and other encoding mechanisms, with applicability depending on the physical type and encoding. [Apache Parquet: Encodings](https://parquet.apache.org/docs/file-format/data-pages/encodings/)

The layout creates opportunities; the data determines their value. Random identifiers and already-compressed binary bodies behave differently from repeated status codes.

Ordering can improve compression and narrow storage statistics. That makes [[data-cluster-related-records|Cluster Related Records]] complementary to columnar storage. Partitioning and clustering help exclude storage regions; projection helps avoid columns within the remaining regions.

A columnar table can still perform an expensive full scan when the query requests nearly everything.

## Example: continuously ingest observability events

An observability service receives small log batches from many agents. Users expect recent events to appear quickly in dashboards.

Writing every event as its own storage part can make ingestion overhead and background maintenance dominate the workload. The solution is usually bounded batching, whether performed by clients or inside the server.

ClickHouse supports asynchronous inserts that collect compatible requests in memory and flush them according to configured thresholds. Its documentation explains that excessive small synchronous inserts create too many parts and can degrade queries. [ClickHouse: Asynchronous inserts](https://clickhouse.com/docs/concepts/features/operations/insert/asyncinserts)

The acknowledgment policy matters. With `wait_for_async_insert=1`, ClickHouse acknowledges after a successful buffer flush to disk and returns flush errors to the client. With waiting disabled, acknowledgment can occur while data remains buffered.

An acknowledgment of buffering is therefore different from confirmed persistence. Replication and distributed read behavior require their own guarantees.

The operating decision is how much buffering delay is acceptable in exchange for fewer parts and more efficient ingestion. Background consolidation can continue after data becomes queryable; readers need not wait for the final optimized layout.

Monitor ingestion delay and query freshness separately from merge activity.

## Example: combine fresh writes with compressed history

A SQL Server application needs transactional updates and frequent analytical summaries over operational data.

SQL Server columnstore indexes illustrate a hybrid approach. Small writes can enter a row-oriented *deltastore*, while established data resides in compressed columnstore rowgroups. Queries combine both to return complete results. A background process moves eligible data into compressed storage.

SQL Server also supports a nonclustered columnstore index on a rowstore table, providing a columnar analytical access path alongside the underlying operational structure. [SQL Server: Columnstore indexes overview](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/columnstore-indexes-overview?view=sql-server-ver17)

This demonstrates an important distinction: recently written rows can be queryable before they reach their final compressed representation.

The additional access path still costs storage and maintenance. Updates and deletes also require engine-specific handling, rather than being free changes to a compressed value sequence.

Whether the hybrid helps depends on the analytical savings relative to the added cost on the write workload.

## Preserve coherent records and processing outcomes

Columnar layout separates physical values without separating their logical relationships. Readers must associate values with the correct row positions and observe a valid table version.

Supported formats and storage engines manage that representation. Independently writing separate column files without a coordinated publication protocol can expose mismatched lengths or versions. A collection of columnar files also needs an appropriate table or manifest mechanism when multiple files must become visible as one result.

Storage layout does not supply ingestion semantics by itself.

A repeated event can still contribute twice unless the pipeline or destination handles duplicates. A late event can still change an earlier total. A checkpoint can still disagree with an external write unless their recovery boundary is coordinated.

Likewise, Parquet specifies a file format, not a complete live-ingestion system with checkpoints, transactional publication, and freshness monitoring.

These responsibilities belong to the surrounding storage and processing protocol.

## Budget for writes, merges, and rewrites

Columnar storage is useful for append-heavy event histories, telemetry, analytical fact tables, and workloads that repeatedly scan a small subset of fields.

Its costs include buffering, encoding, sorting where required, background merges, and maintenance of metadata or additional indexes. Corrections may require delete tracking, new row versions, or rewriting affected storage units.

Very small writes can fragment storage. Very large batches can increase visibility delay and recovery work. Frequent point updates or complete-record lookups may favor another primary access path or a hybrid design.

Benchmark representative queries alongside realistic ingestion. Measure bytes read, CPU, query latency, ingestion-to-visibility delay, part or file counts, and maintenance backlog. Compression ratio alone cannot establish whether the system meets its service goals.

Do not assume faster scans remove every bottleneck. Joins, high-cardinality grouping, data skew, and concurrent demand can still dominate execution.

[[data-partition-by-access-pattern|Partition by Access Pattern]] narrows the storage regions a query considers. [[data-cluster-related-records|Cluster Related Records]] improves locality within those regions. [[data-microbatch-processing|Microbatch Processing]] supplies bounded ingestion units. [[data-freshness-monitoring|Freshness Monitoring]] verifies that efficient storage is still serving sufficiently recent data.

Columnar storage earns its place when narrow analytical questions over many records become cheaper to answer without making fresh data unacceptably slow to reach readers.
