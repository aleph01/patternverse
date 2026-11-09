---
id: data-separate-source-facts-from-derived-interpretations
type: pattern
title: Separate Source Facts from Derived Interpretations
summary: "Preserve source assertions separately from calculated classifications, retaining input and rule references so interpretations can change without rewriting their evidence."
status: published
aliases: []
tags:
  - data-engineering
  - meaning-boundaries
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

**What it is for**

Preserve what a source reported independently from the calculations, classifications, and judgments produced from it.

A delivery dashboard shows that a shipment was late. Months later, the business changes its service-performance rules and wants to recalculate historical results.

The shipment table contains only `late = true`. The original promise, delivery timestamp, and rule version are gone.

Nobody can establish whether the shipment missed its promise by eight minutes or eight hours. Nor can they tell whether the classification reflects an old policy, a corrected timestamp, or a processing mistake.

Separate Source Facts from Derived Interpretations preserves the basis of a conclusion. Source records remain identifiable, and derived outputs explain which inputs and rules produced them.

## “The source reported this” is a precise claim

Source data is not automatically ground truth.

A carrier can report an incorrect timestamp. An employee can mistype an address. An upstream system can publish a “preferred customer” flag that already embodies its own classification.

The source fact, in this pattern, is that a particular source supplied a particular assertion at a particular time or revision.

A derived interpretation adds another step: a calculation, match, classification, estimate, or aggregation performed using those assertions.

The distinction concerns origin and reasoning, not a ranking in which raw data is always more reliable. A validated calculation can improve on an erroneous source value. Keeping both makes that improvement explainable.

The practical question is:

> What did we receive, and what did we conclude from it?

## Eight minutes beyond a promise

Consider an illustrative delivery feed containing shipment S-18. Its source record reports a promised delivery time of 12:00 UTC and a delivery scan at 12:08 UTC.

A strict-deadline rule classifies it as late. Another reporting policy permits a fifteen-minute allowance.

![One retained shipment record reports a 12:00 promise and a 12:08 delivery scan. A strict-deadline rule classifies it as late; a separate rule with a fifteen-minute allowance classifies it as within allowance. Each output retains its input and rule references.](../assets/data-engineering/separate-source-facts-from-derived-interpretations.svg "The same shipment scan at 12:08 and promise at 12:00 produce different interpretations under two versioned rules.")

The reported times have not changed. The interpretations answer different questions:

| Interpretation | Rule | Result |
|---|---|---|
| Strict deadline compliance | Delivery scan no later than promise | Late |
| Allowance compliance | Delivery scan within fifteen minutes after promise | Within allowance |

Publishing those results separately preserves the distinction. Replacing “late” with “on time” without explaining the changed rule would conceal it.

The source evidence also has limits. A delivery scan is the carrier’s recorded observation. Its relationship to actual handover depends on the source’s operating practices.

If the carrier later corrects the timestamp, that is an input revision. If the business changes its allowance, that is a rule revision. The model should make those two causes of change distinguishable.

## Matching records is a conclusion

An illustrative customer pipeline receives these records:

| Source | Record | Name | Email |
|---|---|---|---|
| Purchasing | P-42 | Nora Lee | office@example.org |
| Support | S-17 | Mina Patel | office@example.org |

An initial matching rule treats identical email addresses as the same person and assigns both records to one consolidated customer.

Later investigation establishes that the address is a shared office mailbox used by two people.

If the pipeline replaced the source records with its merged profile, splitting the customer again may require reconstructing lost information.

A safer design preserves the source identities and stores the match as a separate result: these records were grouped by matching rule version 1. A revised rule or reviewed decision can then assign them differently.

The match may be deterministic, but it is still derived. Repeatability does not make its premise correct.

The same distinction applies to categories such as loyal customer, suspicious transaction, high-priority ticket, or likely duplicate. Their usefulness depends on explicit definitions and evidence. They should remain traceable conclusions rather than silently replacing their inputs.

## Databricks: retained inputs and progressive refinement

Databricks’ documented medallion architecture provides a concrete platform design that supports this separation.

Its bronze layer retains raw, unvalidated source data with minimal transformation. Silver applies validation, deduplication, and other refinement. Gold supplies business-oriented models and aggregations. The documentation describes retaining source fidelity to support reprocessing and investigation. [Medallion architecture](https://docs.databricks.com/aws/en/lakehouse/medallion).

This gives teams somewhere to return when a transformation is corrected or a business definition changes.

The layer names alone do not establish provenance. A table called bronze can still discard fields, and a table called gold can still contain an undocumented classification.

The useful mechanism is the maintained relationship between retained inputs, explicit transformations, and published outputs. A small system can implement that mechanism without adopting a full lakehouse architecture.

## Make the derivation inspectable

A derived result needs enough context to explain its production.

That can include input record identifiers or dataset versions, transformation code, rule configuration, reference-data versions, execution time, and the identity of the producing process.

W3C’s PROV family models provenance through the entities, activities, and people involved in producing data. It provides a general foundation for representing where an output came from and how it was derived. [PROV overview](https://www.w3.org/TR/prov-overview/).

For the shipment example, “classification version 2” is insufficient if nobody can recover what version 2 meant. The rule reference must resolve to retained logic or configuration.

Likewise, keeping code without the relevant historical inputs may not permit reproduction. A model can depend on an exchange-rate table, customer mapping, or reference list that has since changed.

The appropriate level of traceability depends on the decision. A daily operational summary and a disputed historical classification may require different retention and reconstruction capabilities.

## What must remain true

**The source boundary must be declared.** “Raw” may mean an original payload, a replicated database record, or an extract already transformed upstream. Document what has happened before the data arrives.

**Cleaning must remain distinguishable from replacement.** Standardizing an address or interpreting a timestamp can be useful, but the original representation may be needed to investigate a mistake.

**Source corrections and rule changes need different identities.** Otherwise, a changed output cannot be explained reliably.

**Missing evidence must remain visible.** An absent delivery scan should not automatically become a late delivery unless that is an explicit reporting rule.

**Historical outputs need a policy.** Recalculation can improve current understanding, while a previous published result may still explain an earlier decision. Retain or identify those perspectives when they matter.

Tests should cover the derivation itself and its connection to inputs. A calculation that returns the expected category but cites the wrong source revision is still misleading.

## Preserve the basis without preserving everything forever

Retained inputs consume storage and require access controls, lifecycle rules, and operational ownership. Reprocessing large histories costs computation. Multiple interpretation versions can confuse consumers unless the published interface identifies which one applies.

The pattern is useful when rules evolve, source records are corrected, classification decisions are disputed, or derived results need to be reproduced.

It does not require keeping every payload indefinitely. Preserve the evidence needed for the system’s purposes within an explicit retention policy. Where inputs can no longer be retained, be honest about the resulting limits on reconstruction.

Common mistakes include overwriting source values with normalized ones, storing labels without their rule versions, and assuming that an append-only dataset must be accurate.

Another mistake is treating source-versus-derived as a permanent property of a field. A score received from a supplier is a source assertion for the receiving pipeline and a derived output of the supplier’s model. Provenance explains that relationship.

## Related patterns

[[data-preserve-raw-inputs|Preserve Raw Inputs]] retains the source representations needed for investigation and bounded replay.

[[data-capture-lineage-at-transformation|Capture Lineage at Transformation]] records the relationships between inputs, processing, and outputs.

[[data-deterministic-transformations|Deterministic Transformations]] makes repeated processing reproducible when the relevant inputs and configuration are fixed.

[[data-shared-business-vocabulary|Shared Business Vocabulary]] defines what classifications and measurements mean.

[[data-replayable-backfills|Replayable Backfills]] applies corrected inputs or revised logic to an explicit historical range.
