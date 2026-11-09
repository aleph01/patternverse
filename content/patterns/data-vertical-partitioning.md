---
id: data-vertical-partitioning
type: pattern
title: Vertical Partitioning
summary: "Separate frequently used fields from large or rarely needed fields, keeping routine reads narrow while preserving identity and version consistency across the split."
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

A live event processor receives a small set of routing fields alongside a large diagnostic payload. Most stages need only the tenant, event type, timestamp, and processing status. Yet every cache lookup and service handoff carries the entire record.

The system spends memory, bandwidth, and storage I/O moving fields that routine processing rarely uses.

**Separate an entity’s fields into groups that match how they are read and updated. Keep the frequently accessed group narrow, and retrieve larger or less-used groups when needed.**

This is vertical partitioning: dividing attributes rather than dividing the population of records. Microsoft’s partitioning guidance describes grouping fields according to their patterns of use, including access frequency and update behavior. [Microsoft: Data partitioning strategy](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/partition-data)

In live processing, the aim is to reduce the data carried through the busiest path while retaining a reliable way to reconstruct the complete record.

## Split by access behavior

A useful boundary separates fields that are commonly accessed together.

An event’s identity, routing attributes, and payload reference might form one group. Its raw body, diagnostic trace, and optional attachments might form another. A processing job’s frequently changing status can be separated from its large, relatively stable definition.

The groups can occupy different tables, separately addressable items in one table, or different storage systems. Separate servers are optional; independently addressable field groups are the essential mechanism.

Each group retains the identity needed to associate it with the logical entity. Version references become important when groups change independently.

![One wide event is split into a narrow core containing identity, routing fields, and a versioned payload reference, plus a separate payload group containing the raw body and diagnostic details. Routine processing reads the core; investigation and replay retrieve the payload when needed.](../assets/data-engineering/vertical-partitioning.svg "Event E901 version 12 has a narrow control record and a separate large payload. The control record references the exact payload version; readers requiring the body fetch it explicitly.")

The benefit depends on actual avoidance. If an application immediately reconstructs the complete record after every read, it adds coordination without removing much work.

## Example: route events without repeatedly loading their bodies

Consider an illustrative event with 500 bytes of core fields and a 200 KB payload.

| Group | Contents | Typical reader |
|---|---|---|
| Core | Event ID, tenant, type, time, payload reference | Router, counter, status service |
| Payload | Original body and diagnostic details | Enrichment, investigation, replay |

At 1,000 events per second, the payload alone represents 200 MB per second using decimal units. The 500-byte core represents 0.5 MB per second, before encoding, compression, and protocol overhead.

The initial ingestion path still receives the original payload. Savings occur when subsequent stages stop loading and forwarding it unnecessarily.

For event E901, the core points to payload P12. A routing stage reads the core, selects the destination, and forwards the reference. A stage that needs the body resolves P12.

This can also reduce the size of buffered records and cached working sets. However, a later payload fetch introduces another request and another latency dependency.

The design works when most stages can make their decisions from the core and relatively few require the large field group. If nearly every stage needs the body, keeping it together may be more efficient.

## Example: split a DynamoDB document into addressable items

A DynamoDB event record initially stores routing fields, a raw body, and diagnostic information in one item.

Returning only the routing fields through a projection expression reduces the response, but does not reduce the item size used to calculate read-capacity consumption. AWS explicitly documents this distinction. [DynamoDB: Projection expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html)

An explicit split changes the storage units being read:

| Partition key | Sort key | Attributes |
|---|---|---|
| `EVENT#E901` | `CORE` | Tenant, type, time, payload version |
| `EVENT#E901` | `BODY#v12` | Raw body |
| `EVENT#E901` | `TRACE#v12` | Diagnostic trace |

A routine `GetItem` for `CORE` addresses a small item. Investigation retrieves the required body or trace item. The application can reconstruct the logical record through its shared identity and sort-key structure.

AWS describes this technique as vertical partitioning in its DynamoDB modeling guidance, including breaking a large document into separately addressable items with a shared partition key. [DynamoDB: Vertical partitioning building block](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-blocks.html#data-modeling-blocks-vertical-partitioning)

The grouping should follow operations, rather than creating one item per scalar attribute. Excessively fine splits multiply requests, keys, and coordination.

Sharing a partition key also does not make arbitrary multi-item reads a transaction. When a coherent group must be read or written atomically, DynamoDB provides transactional APIs with their own limits and costs. [DynamoDB: Transaction APIs](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)

## Example: recognize separation the engine already provides

A PostgreSQL live-events table contains small control columns and a large text payload. The team considers moving every payload into another table.

That may help, but the existing physical behavior deserves inspection first.

PostgreSQL’s TOAST mechanism can compress large values or store them out of line. Its documentation explains that operations on small key fields can use the main row while large attributes are retrieved when needed. The main table can therefore remain much smaller than the complete logical records. [PostgreSQL: TOAST storage](https://www.postgresql.org/docs/current/storage-toast.html)

Explicit vertical partitioning may still provide useful lifecycle, update, or access boundaries. It should not be justified by assuming every narrow query necessarily reads the full large value.

Columnar systems provide another reason to measure first. BigQuery recommends selecting only required columns because excess projection adds I/O and materialization. A manually split table may add little when ordinary column selection already avoids the expensive data. [BigQuery: Control projection](https://docs.cloud.google.com/bigquery/docs/best-practices-performance-compute#avoid_select_)

The pattern is about avoiding unnecessary work, not maximizing the number of tables.

## Publish groups that belong together

Splitting a record creates consistency obligations.

If the core advertises payload P12 before P12 becomes readable, consumers encounter a dangling reference. If the payload is overwritten in place, a reader can combine old routing fields with a newer body.

Within one transactional database, related writes can commit together. Across systems, one approach is to stage an immutable payload, verify its availability, and then atomically publish the core reference.

A crash before publishing the reference may leave an orphan payload. That is usually easier to reconcile than a visible reference to missing data, but it still requires cleanup.

Use exact identities and versions when readers need a particular combination. “Fetch the latest payload for this event” is insufficient when the core was derived from a different version.

Not every field group must advance together. A processing-status revision can change while its immutable input payload remains unchanged. The model should express which versions belong together instead of forcing unrelated updates into one revision number.

Reconstruction must also preserve cardinality. An expected one-to-one detail group should have an appropriate unique key; otherwise, joining the pieces can multiply records.

## Give references a complete lifecycle

Retention and deletion must account for both groups.

Expiring a payload while its core remains available for replay breaks the record’s effective contract. Keeping every detached payload forever creates a different operating problem.

Track referenced versions, active readers where necessary, orphaned objects, and incomplete publication attempts. Deletion policies should define whether the core disappears with its details or remains as an explicit tombstone.

Schema evolution also crosses the boundary. A core should identify enough about its payload representation for consumers to select a compatible decoder.

A small reference is useful only while its target remains identifiable, readable, and interpretable.

## Balance a smaller live path against reconstruction cost

Vertical partitioning is useful when field sizes, access frequencies, update rates, or retention needs differ substantially.

Its costs include extra keys, joins, requests, transactions, reconciliation, and operational ownership. Detail reads can become slower. Fetching payloads individually for a large result set can create an expensive series of requests; batching or a purpose-built detail query may be necessary.

Separating frequently updated state can reduce repeated work on stable attributes, but the outcome depends on the engine’s storage and indexing behavior. It also does not automatically remove row contention or distribute a hot entity across machines.

Measure routine and detail-read latency, bytes transferred, memory use, storage operations, and write amplification. Include the cost of rebuilding complete records.

[[data-claim-check|Claim Check]] carries references instead of large message bodies. **Hot-Cold Tiering** chooses storage tiers according to temperature and cost. [[data-atomic-publication|Atomic Publication]] establishes when a consistent reference becomes visible. [[data-preserve-raw-inputs|Preserve Raw Inputs]] retains the payload evidence needed for investigation and replay.

Vertical partitioning supplies the field boundary: keep the live working set small while preserving deliberate access to the complete record.
