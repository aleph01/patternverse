---
id: data-quarantine-invalid-records
type: pattern
title: Quarantine Invalid Records
summary: "Isolate records that cannot safely proceed, preserving their original content and failure context for investigation, correction, and controlled reprocessing."
status: published
aliases: []
tags:
  - data-engineering
  - quality-observability
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A supplier sends ten thousand order events. One contains `"three"` where an integer quantity belongs. Failing the whole load delays thousands of usable records. Dropping the malformed event removes the evidence needed to explain and recover it.

**Quarantine Invalid Records separates inputs that cannot safely proceed, preserving their original contents and failure context for investigation, correction, and reprocessing.**

Its purpose is to contain a data problem while keeping the affected delivery obligation visible. A useful quarantine has a durable destination, an understandable reason, and a path toward resolution.

## Preserve the input alongside the verdict

A validation rule produces a verdict under a particular contract. A record might fail because it cannot be parsed, lacks a required field, uses an unsupported unit, or violates a business relationship.

The quarantine entry preserves what arrived alongside that verdict. It normally needs:

- Original bytes, or a durable reference to them.
- Source identity and position, such as file version and row number or stream partition and offset.
- Failed rule, rule version, and an actionable reason.
- Detection time, processing version, and recovery status.

An identifier inside the payload may itself be missing or malformed. Source coordinates let operators identify the input even when they cannot parse it.

Preserve evidence before transformations destroy it. A failed numeric conversion that replaces `"three"` with null has already removed useful information unless the original representation remains available.

![Quarantine invalid records: three order events enter a versioned validation gate. E1 and E3 follow the valid path. E2, whose quantity is text, enters durable quarantine with original bytes, source position, rule version, and failure reason. Recovery proceeds through correction, validation, and idempotent publication.](../assets/data-engineering/quarantine-invalid-records.svg "Valid E1 quantity 3 and E3 quantity 2 proceed. E2 text quantity 3 is quarantined with original bytes, source position, and failure reason. A corrected record is revalidated before re-entry.")

*Valid records may proceed only under an explicit partial-delivery policy. The quarantined record remains a recoverable exception.*

## Example: isolate an invalid order event

Suppose an order-event contract requires a positive integer quantity:

| Event | Supplied quantity | Decision |
|---|---|---|
| E1 | `3` | Accept |
| E2 | `"three"` | Quarantine: wrong type |
| E3 | `2` | Accept |

The pipeline retains E2’s payload and source position, records the type failure, and routes E1 and E3 onward.

Whether a numeric string such as `"3"` is acceptable depends on the contract. Coercion should be an explicit transformation with defined behavior. Guessing a number from arbitrary text introduces an interpretation the source did not reliably supply.

Google’s Dataflow guidance demonstrates the routing mechanism: branch failed elements into a separate collection and write them to a sink for later handling. Logging an error and dropping the element loses the data needed for investigation. [Dataflow error handling](https://docs.cloud.google.com/dataflow/docs/guides/pipeline-best-practices#use-dead-letter-queues-for-error-handling)

Amazon Data Firehose provides a concrete implementation for transformation failures. Records marked `ProcessingFailed` are delivered to an S3 `processing-failed` location with raw data, error information, and attempt timestamps. This preserves recovery evidence; investigation and reprocessing still require an operational workflow. [Firehose transformation failure handling](https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-failure-handling.html)

## Make classification exhaustive

Every input needs a recorded outcome.

A subtle SQL mistake defines the valid branch as `WHERE valid_condition` and the invalid branch as `WHERE NOT valid_condition`. If the expression evaluates to null, the record can disappear from both branches.

An explicit classification provides a fallback:

```sql
CASE
  WHEN valid_condition THEN 'accepted'
  ELSE 'quarantined'
END
```

This suits a contract under which an unknown verdict must not pass. The reason should still distinguish a confirmed violation from an inability to evaluate the rule.

For example, a missing customer lookup caused by an unavailable reference service does not establish that the customer is invalid. Record that dependency failure separately and use the appropriate retry or waiting policy.

Likewise, an unexpected software exception may indicate a broken deployment rather than defective input. Routing every exception to quarantine can turn a systemic outage into a rapidly growing pile of supposedly bad records.

## Make the exception path durable

Branching creates a logical path. It does not automatically establish durable delivery.

If a consumer acknowledges a message before its quarantine write succeeds, a crash can lose the only recoverable copy. The affected input must remain available until its disposition is safely recorded.

Use transactional coordination where the platform supports it, or persist a durable classification journal from which destination writes can be retried idempotently. Advancing an ordered source checkpoint must account for preceding records as well.

If quarantine storage fails, retain the source input or pause the affected processing. Continuing while silently losing the exception path defeats the pattern.

Recovery assumptions must also match retention. A quarantine entry pointing to a raw file that expires tomorrow is not recoverable next week.

## Example: retain trips with missing context

A trip pipeline requires pickup and drop-off postal codes for a geographic reporting dataset. Some trip records lack one of those values.

Databricks documents a quarantine pattern that retains records with an `is_quarantined` classification and exposes separate valid and invalid views. Its example uses explicit non-null checks for the two postal codes. The classified dataset preserves the records while downstream paths select their intended population. [Databricks quarantine pattern](https://docs.databricks.com/aws/en/ldp/expectation-patterns#quarantine-invalid-records)

The meaning of failure deserves care. A missing postal code makes the record unsuitable for that report; it does not establish that the trip never happened.

A geographic report using only accepted records may underrepresent places where collection is unreliable. Keep excluded coverage visible and examine failure rates by source and geography.

Quarantine protects a dataset’s acceptance contract. It does not automatically protect the representativeness of the accepted subset.

## Example: hold a whole settlement group

A settlement file contains a debit and its balancing credits. One credit references an invalid account.

Publishing the other entries while quarantining that credit would create an unbalanced settlement. The correct isolation unit is the entire settlement group—or the entire file if its contract requires atomic acceptance.

Preserve the failing record and its diagnostics, but hold the related entries until the group can be validated and published coherently.

Ordered state transitions create a similar problem. If a quarantined event affects the interpretation of later events for an account, continuing those later events can produce an incorrect state. Processing may need to pause for that key while unrelated keys continue.

Error thresholds provide another boundary. Apache Beam YAML supports error outputs and, for some transforms, a threshold that fails processing when too many records encounter errors. Such controls can expose a systemic defect instead of indefinitely accepting partial delivery. [Beam YAML error handling](https://beam.apache.org/documentation/sdks/yaml-errors/)

## Release through validation again

A useful quarantine has an owner and a resolution path.

Investigation may reveal a producer defect, delayed reference data, a legitimate contract change, or an incorrect validation rule. Each requires a different correction.

Preserve the original entry. Record corrections and decisions with provenance: what changed, why, and which rule or processing version now applies. Re-run validation before release rather than inserting repaired records directly into a trusted destination.

Publication must tolerate repeated attempts. A crash after a successful write but before marking an entry resolved can trigger replay. Stable identities and idempotent writes prevent duplicate business effects.

Recovered records also need appropriate ordering. An old update must not overwrite newer state merely because it was released later. For event-time aggregates, recovery may require a historical backfill or an explicit correction after the original window has closed.

Track states such as open, ready for replay, resolved, and intentionally excluded. Resolution should mean that the required outcome was verified, not simply that a retry was initiated.

## Keep quarantine from becoming permanent storage

This pattern is useful when failures are identifiable, evidence can be retained, and recovery has a realistic owner.

Its operating costs include storage, indexing, validation, replay capacity, and investigation time. Monitor incoming failures, unresolved backlog, oldest age, repeated failures, and business impact. A small number of records can represent a large amount of money.

Keep delivery accounting explicit: received inputs should reconcile to accepted, quarantined, and deliberately excluded dispositions. A completed run with unresolved quarantine may still represent incomplete delivery.

Raw payloads can contain sensitive fields. Restrict access, avoid copying full records into routine logs, and align retention with recovery needs.

Quarantine cannot compensate for rules that accept incorrect data, and it cannot make partial publication appropriate where completeness is required.

[[data-schema-validation-boundaries|Schema Validation at Boundaries]] supplies structural verdicts. [[data-dead-letter-queues|Dead-Letter Queues]] can provide the failed-record transport mechanism. [[data-source-to-target-reconciliation|Source-to-Target Reconciliation]] keeps incomplete delivery visible. [[data-idempotent-writes|Idempotent Writes]] makes recovery safe to repeat.
