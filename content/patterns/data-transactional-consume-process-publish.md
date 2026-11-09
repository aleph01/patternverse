---
id: data-transactional-consume-process-publish
type: pattern
title: Transactional Consume–Process–Publish
summary: "Commit outputs, processing state, and consumed-input progress within one supported transaction, so failures preserve or roll back those changes together."
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

A processor reads an order event, publishes a normalized event, and crashes before recording that it consumed the input. On restart, it reads the same input and publishes again.

Reversing the order creates the opposite failure: record consumption first, crash before publishing, and the output disappears.

**Commit the processing results and input progress in one transaction, so recovery cannot retain one without the other.**

Transactional Consume-Process-Publish closes the gap between “the result exists” and “this input is finished.” For stateful processing, recoverable state changes must participate in the same consistency boundary.

Apache Kafka implements this for processing between Kafka topics: output records and consumer-group offsets can belong to one transaction. Kafka Streams extends the mechanism to its managed processing state. [Apache Kafka: Transactional processing design](https://kafka.apache.org/42/design/design/)

## Consumption means committed progress

Reading a record does not remove it from Kafka. A consumer fetches records and maintains a position; committed offsets tell a replacement consumer where to resume.

The transaction joins three things that otherwise could disagree:

- Output records produced from the input.
- Recoverable state changes, when supported by the processing framework.
- The input positions from which processing should continue.

If the transaction commits, its outputs and progress are committed together. If it aborts, its outputs are excluded from committed reads and its input progress does not advance.

Processing code may execute more than once. The guarantee concerns committed effects inside the transaction boundary.

![One transaction contains derived and audit events, managed state changing from 100 to 120, and the next input offset 105. Abort recovery restores state 100 and resumes at offset 104; commit recovery retains state 120 and resumes at 105. External effects require a separate protocol.](../assets/data-engineering/transactional-consume-process-publish.svg "Processing input offset 104 adds 20 to state 100. One supported transaction commits the output, state or changelog 120, and next offset 105, or aborts all. External effects outside the transaction are excluded.")

## Example: publish two outputs without advancing past either

An illustrative normalization service reads:

| Input location | Event | Quantity |
|---|---|---:|
| `orders`, partition 0, offset 104 | E901 | 20 |

It produces a normalized event and an audit event, then records **105** as the next input offset.

Without a transaction, a crash could leave the normalized event published, the audit event missing, and the input either replayed or skipped.

With a transaction, both output records and the offset share one outcome. If it aborts, neither output is available to committed readers, and recovery reprocesses offset 104. If it commits, both outputs are committed and recovery resumes at 105.

Kafka’s producer API supports this through `sendOffsetsToTransaction`. The offsets represent the next records to process, and the API accepts the active consumer’s group metadata to support ownership checks. [Apache Kafka: KafkaProducer transaction API](https://kafka.apache.org/42/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)

A simplified success path is:

```text
batch = consumer.poll()
producer.beginTransaction()

for record in batch:
    producer.send(transform(record))

producer.sendOffsetsToTransaction(
    next_completed_offsets, consumer.groupMetadata()
)
producer.commitTransaction()
```

This omits initialization and failure handling. It also assumes every record covered by the supplied offsets has completed its processing.

With concurrent processing, committing beyond an unfinished earlier record would incorrectly declare that record complete.

## Readers must respect transaction outcomes

Writing transactionally is only half of the protocol. Downstream consumers must avoid acting on provisional or aborted records.

Kafka consumers configured with `isolation.level=read_committed` return committed transactional records. The default `read_uncommitted` setting can expose records from transactions that later abort. Ordinary nontransactional records remain readable in either mode. [Apache Kafka: Consumer isolation configuration](https://kafka.apache.org/42/configuration/consumer-configs/#isolation.level)

Atomic commitment also does not mean a consumer receives an entire transaction in one poll. Records distributed across topics and partitions may be fetched separately. Applications requiring a complete business bundle still need a way to identify and assemble that bundle.

The transaction establishes a shared commit outcome, rather than a global delivery order across partitions.

## Example: update an aggregate without counting a retry twice

A processor maintains a product’s total received quantity.

Its committed total is 100. Processing E901 adds 20 and produces a new total of 120. The processor must coordinate the state update, the published total, and the consumed offset.

A custom implementation that updates an ordinary in-memory variable, aborts the Kafka transaction, and then replays the record could add 20 again. The producer transaction does not automatically roll back application memory.

Kafka Streams provides managed state stores and recovery coordinated with transactional processing. Its exactly-once processing guarantee covers input offsets, state-store updates, and output-topic records. The supported configuration is `processing.guarantee=exactly_once_v2`. [Apache Kafka Streams: Processing guarantees](https://kafka.apache.org/42/streams/core-concepts/#processing-guarantees), [Streams configuration](https://kafka.apache.org/42/streams/developer-guide/config-streams/)

In this example, an aborted attempt must recover the committed total of 100 before replaying E901, yielding 120. A committed attempt recovers 120 and continues with the next input.

This does not deduplicate business events already duplicated in the source. If E901 appears as two separate input records, both can legitimately be processed under the transactional protocol. Business-level deduplication remains a separate requirement.

## Recover according to the transaction outcome

A crash before commitment and a missing commit acknowledgment are different situations.

After a known abort, recovery must restore processing state and reset the consumer to committed progress. Aborting a producer transaction does not automatically rewind the consumer’s current position. Kafka’s design documentation explicitly calls out this recovery responsibility. [Apache Kafka: Transaction recovery](https://kafka.apache.org/42/design/design/)

A commit timeout is more subtle: the transaction might already be committing successfully. Blindly aborting and starting another attempt is unsafe. Kafka’s producer documentation directs callers to retry the commit where permitted or close the producer; switching immediately to an abort is not valid while commitment may be completing. [Apache Kafka: Commit behavior](https://kafka.apache.org/42/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html#commitTransaction())

Ownership changes matter too. Transactional producer identities and consumer-group metadata help prevent obsolete processing instances from committing after takeover. Fencing failures require stopping the obsolete instance’s transactional work.

These recovery rules are why a framework-managed implementation is often preferable to a short custom loop.

## Example: a support-ticket API remains outside the transaction

Suppose processing an event also creates a ticket through an external HTTP API.

The API accepts the request. The Kafka transaction then aborts.

On replay, the processor calls the API again. Kafka correctly excludes the aborted output records and preserves input progress, but it cannot undo the ticket.

The same boundary applies to independent database writes, object-store mutations, and notifications.

One arrangement is to publish a ticket-creation command within the Kafka transaction. A separate consumer executes that command using a stable operation identifier and destination-supported idempotency. Where business updates and message publication originate in a database, a transactional inbox and outbox can coordinate the local changes.

Those mechanisms supply additional guarantees at additional boundaries. A Kafka transaction does not automatically include them.

The native guarantee also does not span separate Kafka clusters. Crossing that boundary requires a suitable replication or delivery protocol.

## Bound the transaction and define unsuccessful outcomes

Larger transactions amortize commit overhead, but increase the work repeated after an abort and delay output availability. Smaller transactions commit more frequently and increase coordination costs.

Long-running transactions can also hold back committed readers. Kafka’s `read_committed` consumers stop at the last stable offset, so an open transaction can delay later records in the same partition until its outcome is resolved. [Apache Kafka: Read-committed behavior](https://kafka.apache.org/42/configuration/consumer-configs/#isolation.level)

Operating costs include transaction coordination, replication, managed-state changelogs, recovery time, and monitoring aborted transactions, processing lag, and fencing failures.

A permanently invalid record needs a defined outcome. Repeatedly aborting the same batch can prevent progress indefinitely. One policy is to publish a rejection record and advance past the invalid input within the transaction, explicitly recording why normal processing did not occur.

Transactions cannot correct faulty transformations, unsuitable event-time rules, or changing external reference data. Reproducible replay still benefits from deterministic logic and identified reference versions.

## Choose the boundary that matches the work

This pattern is useful when a processing stage consumes a durable stream and publishes derived records within a transaction-capable system, especially for aggregations and multi-output transformations.

[[data-transactional-inbox|Transactional Inbox]] coordinates receipt with local business changes. [[data-transactional-outbox|Transactional Outbox]] coordinates local changes with durable publication intent. [[data-idempotent-writes|Idempotent Writes]] handles repeated effects at destinations outside the transaction. [[data-leases-with-fencing-tokens|Leases with Fencing Tokens]] explains why obsolete owners must lose authority at the protected resource.

Transactional Consume-Process-Publish joins results and progress into one recoverable outcome. Its usefulness depends on identifying exactly which results belong to that outcome—and providing separate protection for everything beyond it.
