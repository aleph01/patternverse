---
id: data-version-dimension-rows-scd-type-2
type: pattern
title: Version Dimension Rows — SCD Type 2
summary: "Preserve successive descriptions as separate dimension rows with validity intervals, linking each fact to the appropriate version for historical reporting."
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

An account moves from East territory to West in July. The warehouse updates its territory, and suddenly its January sales appear under West too. The transactions are unchanged, but their historical context has disappeared.

Keeping both territory names is not enough. Each sale needs a dependable connection to the account description that applied when the sale occurred.

**Version Dimension Rows**, conventionally called **Slowly Changing Dimension Type 2**, preserves successive descriptions of an entity as separate dimension rows. Each version receives its own surrogate key and a validity interval. Facts reference the appropriate version, allowing historical activity to retain its contemporary context. [Kimball Group: Type 2 — Add New Row](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/)

## One entity, several versions

Type 2 separates two identities:

- The **durable entity identifier** connects all versions of the same account.
- The **version surrogate key** identifies one particular description of that account.

For account A42, a territory reassignment produces:

| Account key | Account ID | Territory | Valid from | Valid to | Current |
|---|---|---|---|---|---|
| 107 | A42 | East | 2026-01-01 | 2026-07-01 | No |
| 208 | A42 | West | 2026-07-01 | Open | Yes |

The old row remains available. Its end boundary closes when the new version begins.

A42 still identifies one account, while keys 107 and 208 identify different versions. Counting dimension rows would count versions; counting distinct durable account identifiers would count accounts.

Microsoft’s dimensional-modeling guidance uses salesperson region changes to illustrate this same separation between a business entity and its historical versions. [Microsoft: Star schema guidance](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema)

## Example: preserve territory at the time of sale

Suppose A42 generates $100 on June 15 and $200 on July 15. The reassignment becomes effective at midnight UTC on July 1.

The June sale receives account key 107. The July sale receives key 208.

![Diagram showing account A42 represented by an East version with key 107 before July 1 and a West version with key 208 afterward. June revenue references the East version; July revenue references the West version. A June sale arriving in August still uses the East version.](../assets/data-engineering/version-dimension-rows-scd-type-2.svg "Two surrogate rows preserve the region history. A late-arriving June event still joins to key 107.")

*Illustrative data. Validity represents business-effective time; interval ends are exclusive.*

A historical report now assigns $100 to East and $200 to West. Ordinary reporting joins use the stored surrogate keys, without repeatedly resolving date ranges.

A report using today’s territory assignment asks a different question. Provide an explicit current-state view or another clearly named relationship when both perspectives are needed.

## Boundaries must select exactly one version

A practical convention represents validity as a **half-open interval**:

**Valid from is inclusive; valid to is exclusive.**

East applies before July 1. West applies from July 1 onward. A sale exactly at the transition belongs to West.

This avoids overlapping endpoints and brittle conventions such as subtracting one second from the old version’s end. Timestamp precision can change; matching interval boundaries remain clear. Kimball specifies that one version’s end should equal the next version’s beginning. [Kimball Group: Slowly Changing Dimensions, Part 2](https://www.kimballgroup.com/2008/09/slowly-changing-dimensions-part-2/)

At fact-loading time, the version lookup can be expressed as:

```sql
SELECT s.sale_id, d.account_key
FROM staged_sales s
JOIN dim_account d
  ON d.account_id = s.account_id
 AND s.sold_at >= d.valid_from
 AND (s.sold_at < d.valid_to OR d.valid_to IS NULL);
```

Here, null means an open upper boundary. A consistently handled future sentinel is another option.

Validate that each fact finds exactly one appropriate version. Multiple matches indicate overlapping history. Missing matches require explicit handling rather than silently losing the fact through an inner join.

## Choose what the dates mean

A validity interval can describe when something was true in the business or when a system recorded a particular state. Those meanings can differ.

A reassignment effective July 1 might reach the warehouse on July 4. Business-effective history should place the boundary on July 1, assuming authoritative evidence supports that date. Observation-based history may record July 4.

Neither interpretation should hide behind an unexplained `valid_from` name.

For comparison, SQL Server system-versioned temporal tables derive their period boundaries from database transaction time. Those boundaries do not automatically establish when a business change actually took effect. [Microsoft: Temporal tables](https://learn.microsoft.com/azure/azure-sql/temporal-tables)

If reports must answer both “What do we now believe applied then?” and “What did we believe at that earlier reporting date?”, a single Type 2 timeline is insufficient. That requires separately tracking business validity and recording history, commonly through bitemporal modeling.

## Create versions for meaningful changes

For an ordinary forward change, the loader closes the previous version and inserts its successor with a new surrogate key. Publish those changes together so readers do not encounter an incomplete transition.

Compare only the attributes designated for Type 2 treatment. Including a load timestamp creates versions on every refresh. Inconsistent null handling, whitespace, or casing can also manufacture changes without a business difference.

Reprocessing the same accepted change should leave the same history. Concurrent loads need coordination so they cannot create competing versions.

The underlying assumptions are substantial: identifiers refer to the same entity across time, sources have agreed authority, effective timestamps are trustworthy, and conflicting changes have deterministic ordering.

For a single-valued history, intervals must not overlap. Gaps should be intentional and explained. A current flag should agree with the chosen validity policy; future-effective versions and retired entities need explicit treatment.

## Late facts and late changes are different problems

A June sale arrives in August. West is now the current territory, but the sale still belongs to the East version. Resolve its key using the June event timestamp, not the arrival timestamp or current flag. Kimball explicitly requires historical version lookup for late-arriving facts. [Kimball Group: Late-arriving facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/late-arriving-fact/)

Now suppose the warehouse learns in August that the reassignment actually took effect on June 20.

That is a late dimension change. The accepted timeline needs revision, and facts from June 20 onward may require reassignment to the correct version. Merely adding a new row effective in August leaves business-effective history wrong. Kimball notes that retroactive Type 2 changes can require inserting a version and restating associated facts. [Kimball Group: Late-arriving dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/late-arriving-dimension/)

Retain enough source identity and event timing to repair those assignments. Historical reporting also needs an explicit policy for corrections and downstream aggregate refreshes.

## A documented implementation: dbt snapshots

dbt snapshots implement Type 2 history over mutable source tables. Its documentation illustrates an order moving from `pending` to `shipped`: the snapshot retains both states with `dbt_valid_from` and `dbt_valid_to` boundaries. A reliable update timestamp or comparison of selected columns drives change detection. [dbt: Snapshots](https://docs.getdbt.com/docs/build/snapshots)

This supplies a history-capture mechanism, but capturing versions and assigning fact foreign keys remain separate responsibilities.

Snapshot frequency also limits what can be known. If an order changes from pending to approved to shipped between runs, a snapshot of the final state cannot recover the overwritten intermediate state. dbt explicitly documents this limitation. [dbt: Choosing incremental models or snapshots](https://docs.getdbt.com/best-practices/how-we-handle-cdc/2-choosing-incremental-or-snapshots)

Preserving every transition requires a source history or change stream that exposes those transitions.

## History has storage and maintenance costs

Type 2 adds rows, validity checks, change detection, and temporal lookup work. Frequently changing attributes can multiply a wide dimension rapidly. Version only the attributes whose historical context supports useful questions; operational measurements or detailed transitions may belong in fact or event tables.

Common reporting mistakes include joining facts to every version through the business identifier, which multiplies results, and filtering the historical dimension to current rows, which excludes facts referencing older versions.

Type 2 also preserves only the history captured or reconstructed from evidence. Starting today cannot recover years of overwritten source values. Corrected timelines can change previous reports, so versioned dimensions alone do not guarantee reproducible reporting.

## Neighboring patterns clarify the choice

[[data-retain-original-values-scd-type-0|Retain Original Values — SCD Type 0]] keeps a starting condition. [[data-overwrite-attributes-scd-type-1|Overwrite Attributes — SCD Type 1]] supplies a current or corrected description without retaining previous values in that attribute. Different attributes in one dimension can use different policies.

[[data-surrogate-keys|Surrogate Keys]] distinguish versions while durable identifiers connect the entity. [[data-separate-entities-from-events|Separate Entities from Events]] helps decide whether a changing property belongs in a versioned description or whether the business needs the individual transitions as events with their own timing, reasons, and measures.
