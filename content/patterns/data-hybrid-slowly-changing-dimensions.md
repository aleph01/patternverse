---
id: data-hybrid-slowly-changing-dimensions
type: pattern
title: Hybrid Slowly Changing Dimensions
summary: "Combine dimension-history techniques so the same measurements can be grouped by both historical attributes and current classifications, with each perspective explicit."
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

A customer moves from the East sales region to the West. Finance wants last quarter’s revenue attributed to the region responsible when each sale occurred. The new regional manager wants the customer’s entire purchase history included in the West portfolio.

Both questions are reasonable. A dimension that overwrites the region answers the second but loses the first. A dimension that preserves historical versions answers the first but needs another mechanism for the second.

**Hybrid Slowly Changing Dimensions combine change-handling techniques so the same facts can support more than one deliberate perspective on changing business attributes.** Their purpose is to preserve useful history while making current classifications accessible.

The central modeling decision is what each perspective means—and how a reader selects it.

## One entity, several rules for change

Here, the facts are sales records. The customer dimension stores descriptions used to group those sales. Type 1 overwrites an attribute with its latest value; Type 2 preserves successive versions with their effective dates.

A customer dimension might preserve the original acquisition channel, overwrite corrected spelling, and create a new version when the customer changes segment. Different attributes deserve different treatments.

Microsoft’s dimensional-modeling guidance explicitly allows a dimension to combine Type 1 and Type 2 behavior across different columns. That combination is a useful starting point, but it does not automatically make the design a Type 6 dimension. [Microsoft: Slowly changing dimensions](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema#slowly-changing-dimensions).

The more specific hybrid techniques address a further requirement: showing historical facts under both their historical classification and a current classification.

## Type 6: carry the current classification alongside history

Consider customer A42, who moves from East to West on July 1.

The dimension retains the historical region for each effective period and adds a separate current-region attribute. Whenever the region changes, the current-region value is overwritten across **every version of that customer**. This is the defining mechanism of Kimball’s Type 6 technique. [Kimball Group: Type 6](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-6/).

![Type 6 hybrid dimension: historical region remains East on the earlier customer version, while current region is West on both versions. The same facts produce historical totals of East 100 and West 200, or a current-region total of West 300.](../assets/data-engineering/hybrid-slowly-changing-dimensions.svg "An illustrative Type 6 hybrid combines Type 2 historical region and Type 1 current region for customer A42. Version 107 is East during [January 1, July 1), version 208 is West from July 1. After the change, current region is overwritten to West on both rows. June sale 100 references key 107, July sale 200 references 208. Historical grouping returns East 100 and West 200; grouping by current region returns West 300. The stored fact keys do not change.")

A June sale of 100 references customer version 107. A July sale of 200 references version 208.

Grouping by **Region at sale** produces East 100 and West 200. Grouping by **Current customer region** produces West 300. The fact keys and amounts remain unchanged. The first version includes January 1 and ends just before July 1; July 1 belongs to the second version.

The reporting interface should expose those names directly. Two fields both labeled “Region” invite accidental answers.

The loading process must publish a coherent change: close the earlier effective interval, create the new historical version, and propagate the current classification. Readers should see a consistent published state throughout that transition.

## Type 5: preserve profiles without copying the whole customer

Suppose a retailer classifies customers into loyalty profiles. These combinations change frequently enough that creating another wide customer row for every change would become expensive.

A mini-dimension stores the distinct profiles:

| Profile key | Loyalty tier | Engagement band |
|---|---|---|
| 11 | Silver | Occasional |
| 13 | Gold | Frequent |

Customer C17 makes a January purchase of 100 while assigned profile 11, then a March purchase of 60 while assigned profile 13. Each purchase fact stores the profile key applicable to that purchase.

For historical analysis, the results are Silver 100 and Gold 60.

The customer’s base dimension also holds a current-profile reference, now pointing to profile 13. Following that reference classifies the customer’s entire purchase history as Gold, totaling 160.

This additional current reference turns the mini-dimension arrangement into Type 5. Kimball recommends presenting the base dimension and its current profile together logically, so consumers can access current attributes without navigating through a fact table. [Kimball Group: Type 5](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-5/).

An important consequence follows: the current-profile reference must change even when the customer makes no purchase. Otherwise, “current” silently becomes “profile at the most recent transaction.”

## Type 7: give facts two explicit access paths

A retailer moves store S19 from the North operating region to the South. January revenue was 80,000; August revenue was 120,000.

The business wants historical operating results and a current organizational view. Instead of copying current-region attributes onto every historical store version, it can store two identifiers on each fact:

- A surrogate key identifying the store version applicable to the sale.
- A durable key identifying the store across its versions.

The historical view joins through the version key. The current view joins through the durable key and selects the current dimension row. Kimball calls this Type 7 and recommends exposing the perspectives through separate views. [Kimball Group: Type 7](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-7/).

In these join conditions, `f` is the sales fact table and `d` is the store dimension. The first selects the version used for the sale; the second selects the store’s current version:

```sql
-- Historical organization
ON f.store_version_key = d.store_version_key

-- Current organization
ON f.store_id = d.store_id
AND d.is_current = true
```

Historical grouping returns North 80,000 and South 120,000. Current grouping returns South 200,000.

Omitting the current-row condition joins each fact to every version of S19. With two versions, the total incorrectly doubles to 400,000. Separate published views make that mistake harder to introduce.

## Choose where the current view lives

Three established designs make different physical choices:

| Design | How it exposes both perspectives |
|---|---|
| Type 5 | Historical mini-dimension references on facts, plus a current profile reference on the base dimension |
| Type 6 | Historical and current versions of selected attributes in the versioned dimension |
| Type 7 | Historical version keys and durable entity keys on facts, with separate join paths |

These are alternatives to evaluate against a reporting requirement. A warehouse does not need all three.

## What must hold for the answers to be correct

A hybrid depends on reliable identity. A durable key must continue to identify the same entity across versions. A reused source identifier can otherwise transfer one customer’s history to another.

Historical versions also need unambiguous effective intervals. For a single-valued classification, no two versions should claim the same instant. A late-arriving June sale must resolve to the June version, even if the warehouse receives it in August.

“Current” needs its own definition. It might mean effective now, effective at the dataset’s publication cutoff, or the latest approved classification. Future-dated records and out-of-order updates make “most recently loaded row” an unsafe substitute.

The following checks protect the mechanism:

- Every historical fact key resolves to one dimension version.
- Each entity expected to have a current representation has exactly one.
- Type 6 current attributes agree across that entity’s versions.
- Switching perspectives preserves the selected fact population and overall total when no classification filter intentionally changes the population.

These checks cannot decide the business policy. Whether a reorganized territory should inherit historical sales requires an explicit agreement with the people using the report.

## The cost of supporting both perspectives

Type 6 makes queries straightforward, but a current-value change can update many historical rows. Entities with long histories increase write volume, refresh work, and the scope of consistency checks.

Type 5 reduces pressure on a wide base dimension when selected profiles change frequently. Its costs include profile matching, additional references, and maintaining the current assignment independently of transaction activity.

Type 7 avoids copying current attributes across all versions. It adds identifiers to facts and requires carefully managed views or semantic relationships.

All three add maintenance obligations. Current classifications can change historical-looking reports without any new facts arriving. Cached results, extracts, and aggregates that group by current attributes may therefore need refreshing after a dimension update.

The extra machinery is useful when both perspectives are recurring business needs—for example, historical sales attribution alongside current account ownership. If consumers require only one perspective, a simpler change policy is usually easier to operate.

## Where hybrids stop helping

A current classification is intentionally mutable. A report generated today can group last year’s sales differently from the same report generated last month.

Preserving effective-dated history does not, by itself, preserve what the warehouse knew at every previous reporting date. Reproducing an earlier published answer may require recorded-time history, bitemporal records, or retained publication snapshots.

Hybrids also do not resolve simultaneous membership. A customer belonging to two sales territories needs a relationship model and, where relevant, allocation rules. Adding more current and historical columns does not establish how revenue should be distributed.

Common failures include overwriting the historical attribute, updating only the newest row’s current attribute, using an unrestricted durable-key join, and labeling a current regrouping as historical attribution. Each produces plausible output with the wrong meaning.

## Related patterns

[[data-version-dimension-rows-scd-type-2|Version Dimension Rows — SCD Type 2]] supplies historical versions. [[data-overwrite-attributes-scd-type-1|Overwrite Attributes — SCD Type 1]] supplies the current-value behavior. [[data-mini-dimensions|Mini-Dimensions]] separate frequently changing profiles. [[data-as-of-joins|As-of Joins]] resolve facts against effective history, while [[data-recorded-time-history|Recorded-Time History]] preserves how recorded knowledge changes.

A hybrid brings selected mechanisms together around a reporting choice: the classification that applied when something happened, or the classification through which the business wants to view it now.
