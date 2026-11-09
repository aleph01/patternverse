---
id: data-keep-previous-values-scd-type-3
type: pattern
title: Keep Previous Values — SCD Type 3
summary: "Keep a previous attribute value beside the current value for limited comparison, accepting that older changes and complete event-time history are not preserved."
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

A sales organization redraws its territories. Managers want to see this year’s revenue under the new assignments—and compare the same revenue using the former assignments.

Overwriting the territory removes the comparison. Preserving every historical version introduces more machinery than this particular question requires.

**Keep Previous Values**, commonly called **Slowly Changing Dimension Type 3**, retains a selected former value in an additional column while updating the current value. The dimension row and its key remain stable. Reports choose which attribute supplies their grouping.

Kimball calls this an “alternate reality”: the same facts can be filtered or grouped through either the current classification or a retained alternative. [Kimball Group: Type 3 — Add New Attribute](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-3/)

## Keep another perspective in the same row

A simple Type 3 account dimension might contain:

| Account key | Account ID | Current territory | Previous territory |
|---|---|---|---|
| 107 | A42 | West | East |

Sales continue referencing account key 107. A report grouped by `current_territory` places those sales under West. Grouping by `previous_territory` places the same sales under East.

No extra fact rows are required, and the account does not receive another dimension version for this change.

The additional column preserves a deliberately limited perspective. Microsoft’s dimensional-modeling guidance describes Type 3 as retaining limited history through attributes, including a previous assignment or an initial-and-current comparison. [Microsoft: Modeling dimension tables](https://learn.microsoft.com/en-us/fabric/data-warehouse/dimensional-modeling-dimension-tables)

The important design decision is what the retained column means. “Immediately preceding assignment,” “assignment before the reorganization,” and “original assignment” require different maintenance rules.

## Example: a rolling previous territory

Account A42 begins in East. In July it moves to West. In October it moves again, to Central.

With a rolling previous-value policy, the same dimension row passes through three states:

| State | Current territory | Previous territory |
|---|---|---|
| January | East | No recorded predecessor |
| July | West | East |
| October | Central | West |

On each accepted change, the current value moves into the previous slot, and the incoming value becomes current. The former contents of the previous slot are displaced.

![Diagram showing three successive states of account A42: East with no recorded predecessor, West with previous East, then Central with previous West. The same $300 of sales can be grouped under previous territory West or current territory Central; East is no longer retained.](../assets/data-engineering/keep-previous-values-scd-type-3.svg "Each pair is current region / previous region on key 107. The October overwrite drops East; this is not an as-of history.")

*Illustrative data. Two columns retain the current assignment and its immediate predecessor.*

Suppose the account generated $100 in June and $200 in August. In October, grouping both sales by previous territory assigns $300 to West. Grouping by current territory assigns $300 to Central.

Neither result reconstructs territory at the time of each sale. June’s sale occurred under East, which has disappeared from this two-slot representation.

**A previous-value column offers a comparison perspective; it does not automatically provide event-time history.**

## “Previous” may need to stay fixed

Now consider a retailer comparing product performance before and after a category redesign.

A product previously classified as Office Supplies is now classified as Creative Materials. Analysts want to compare an entire reporting period under both classification systems.

Useful columns might be:

| Product | Category under 2025 structure | Current category |
|---|---|---|
| P-81 | Office Supplies | Creative Materials |

If another category adjustment occurs during the year, automatically rotating the current category into the retained column would destroy the agreed 2025 comparison.

Here, the alternate column remains fixed until the business deliberately replaces that baseline. Kimball describes Type 3’s use for alternative product classifications that remain available across the facts being analyzed. [Kimball Group: Slowly Changing Dimensions, Part 2](https://www.kimballgroup.com/2008/09/slowly-changing-dimensions-part-2/)

Name the perspective explicitly. `category_under_2025_structure` communicates more than `old_category`.

This design assumes one category per product within each chosen perspective. Products belonging to several categories require a relationship model that represents that multiplicity, potentially with a bridge table.

## Rotate values only when a real change is accepted

For a rolling design, the conceptual update is short:

```text
When an accepted value differs from the current value:
    retain the current value as previous
    replace current with the accepted incoming value
    record when that change became effective
```

The retained value must come from the row’s state before replacement. Publish the related changes together so readers see a coherent pair.

Repeated delivery of an unchanged value must leave the predecessor intact. Otherwise, replaying West can turn `(East, West)` into `(West, West)` and erase the useful comparison.

Late and out-of-order messages need similar care. An obsolete East update arriving after West should not automatically rotate the row backward. Establish source authority, ordering, and duplicate handling before applying the change.

Corrections also need a policy. Fixing a misspelled territory name may correct the existing slot without creating a new business predecessor. Treating every source edit as a transition makes “previous” unreliable.

## A documented implementation: product packaging

Oracle’s archived Warehouse Builder 11g documentation describes a concrete Type 3 implementation for product packaging attributes.

A product dimension can pair `PACKAGE_TYPE` with `PREV_PACK_TYPE`, and `PACKAGE_SIZE` with `PREV_PACK_SIZE`. When package type changes, the existing type moves into its previous-value attribute and the incoming type becomes current. The model also includes an effective-date attribute. [Oracle: Defining dimensional objects](https://docs.oracle.com/cd/E18283_01/owb.112/e10935/dim_objects.htm)

For an illustrative product changing from Box to Pouch, the resulting pair would be previous Box, current Pouch. A later change to Tin would leave previous Pouch, current Tin.

This is documented product functionality rather than evidence of a particular organization’s deployment. It demonstrates that the mechanism is configurable, while the business still determines which changes deserve retention.

Tool support varies. Microsoft’s SSIS Slowly Changing Dimension transformation explicitly does not directly support Type 3 changes, so using that component requires additional handling. [Microsoft: Slowly Changing Dimension transformation](https://learn.microsoft.com/en-us/sql/integration-services/data-flow/transformations/slowly-changing-dimension-transformation)

## Dates help explain the pair, but do not restore lost history

A field such as `territory_changed_at` helps explain when the current territory began. It does not recover every earlier assignment or establish when the retained predecessor originally began.

Several independently changing attributes create another trap. Previous territory and previous customer segment may come from different dates. Reading them together as one former customer profile can invent a state that never existed.

Use attribute-specific change dates when needed, or rotate a defined group together when the business treats it as one coherent transition.

Initialization also matters. An empty previous slot might mean no predecessor, unavailable history, or an entity introduced after the comparison baseline. Those meanings should remain distinguishable where reporting depends on them.

## Limited history brings bounded storage—and ongoing work

Type 3 adds columns without multiplying dimension rows. Queries remain simple, and report authors can compare two named perspectives without temporal joins.

The cost moves into maintenance: preserving the intended baseline, preventing duplicate rotations, resolving corrections, and keeping dependent outputs consistent.

Updating either grouping column can change reports covering years of facts. Stored aggregates, extracts, or caches that materialize those classifications may require refreshing. Type 3 inherits this consequence from its overwrite behavior. [Kimball Group: Slowly Changing Dimensions, Part 2](https://www.kimballgroup.com/2008/09/slowly-changing-dimensions-part-2/)

Adding `previous_2`, `previous_3`, and further columns extends the horizon only temporarily. It widens the schema and complicates interpretation. If the requirement keeps expanding toward arbitrary historical dates, versioned rows are usually the clearer representation.

## Choose the neighboring pattern by the question

Use Type 3 when a small, explicit set of comparison perspectives is enough: the current and preceding assignment, or a current classification alongside an agreed former structure.

[[data-overwrite-attributes-scd-type-1|Overwrite Attributes — SCD Type 1]] keeps only the current or corrected value. [[data-retain-original-values-scd-type-0|Retain Original Values — SCD Type 0]] protects a defined starting value. [[data-version-dimension-rows-scd-type-2|Version Dimension Rows — SCD Type 2]] preserves successive versions for historical lookup. [[data-shared-business-vocabulary|Shared Business Vocabulary]] makes the retained perspective precise: what “previous” refers to, when it advances, and which comparisons remain valid.
