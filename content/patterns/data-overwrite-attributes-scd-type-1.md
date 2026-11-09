---
id: data-overwrite-attributes-scd-type-1
type: pattern
title: Overwrite Attributes — SCD Type 1
summary: "Replace an attribute in its existing dimension row when the model needs the corrected or current value, accepting that earlier classifications are overwritten."
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

A customer changes their email address. The warehouse keeps both addresses, creates another customer version, and adds complexity to every downstream query—even though nobody needs to analyze the old address.

Elsewhere, an account moves from East to West territory. Someone overwrites its territory, and last quarter’s sales suddenly appear under West. The update was technically simple; its reporting consequences were substantial.

**Overwrite Attributes** replaces an existing dimension attribute with its latest accepted value. Known as **Slowly Changing Dimension Type 1**, it keeps the dimension’s current description without retaining that attribute’s previous values there. Microsoft describes customer email addresses and phone numbers as common applications. [Microsoft: Star schema guidance](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema)

The pattern is useful when the latest description is the intended reporting perspective, or when an earlier value was wrong and should be corrected.

## One identity, a revised description

In a simple Type 1 dimension, an incoming record matches an existing entity, and selected attributes are updated in the same dimension row. The surrogate key stays stable. Existing fact rows continue referencing that key.

An account might change like this:

| Dimension key | Account ID | Current territory |
|---|---|---|
| 107 | A42 | East → West |

There is still one account row. No additional version is created for the territory change.

This makes Type 1 straightforward to query: facts join to the dimension and receive its latest accepted description. The previous territory is no longer available from that attribute. Kimball’s definition emphasizes both properties: overwriting avoids additional dimension rows and removes the attribute’s history. [Kimball Group: Type 1 — Overwrite](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-1/)

“Latest” means latest successfully accepted into this model. A daily refresh can still leave the warehouse behind the operational system.

## Example: reorganize accounts under today’s territories

Account A42 generates $100 in January and $200 in June while assigned to East. On July 1, the sales organization transfers it to West.

The business wants to compare account performance using today’s territory assignments. Updating `current_territory` from East to West provides that perspective.

![Before and after diagram showing account A42 retaining dimension key 107 while its current territory changes from East to West. January sales of $100 and June sales of $200 retain their foreign keys; grouping by current territory moves the combined $300 from East to West.](../assets/data-engineering/overwrite-attributes-scd-type-1.svg "Customer key 107 is unchanged. Overwriting East with West makes all historical facts report under West.")

*Illustrative data. The same sales receive a different grouping after the dimension update.*

Neither sale changes amount, date, or account reference. Yet a report grouped by current territory now assigns all $300 to West.

That answers “What historical revenue belongs to accounts currently managed by West?” It cannot establish which territory owned those sales when they occurred.

Names such as `current_territory` help readers recognize the perspective. A generic `territory` column leaves too much room for interpretation. If compensation depends on ownership at the time of sale, preserve that assignment through an appropriate historical model or an explicit transaction-level relationship.

## Example: correct a description that was always wrong

A product arrives with the display name **Wirless Speaker**. The source corrects it to **Wireless Speaker**.

Keeping the misspelling as a historical product version adds little value to ordinary sales analysis. Overwriting the display name lets old and new transactions display the corrected label while retaining the same product key.

A correction and a genuine business change can use the same update mechanism, but they carry different meanings. Correcting a misspelling improves the description of earlier activity. Reassigning a product to another category deliberately changes its current classification.

Kimball identifies both error correction and a conscious decision to omit attribute history as reasons to use Type 1. The choice should be visible to report users. [Kimball Group: Slowly Changing Dimensions](https://www.kimballgroup.com/2008/08/slowly-changing-dimensions/)

Preserve distinctions that matter. A corrected customer contact address does not necessarily change the delivery address recorded on an earlier order.

## “Overwrite” still requires rules about which value wins

An update statement cannot decide whether an incoming value deserves to replace the existing one.

Correctness depends on several assumptions.

**The match identifies the same entity.** Account numbers may require a source namespace. Reused identifiers, accidental duplicates, and unresolved merges can cause a valid update to modify the wrong customer.

**The source has authority over the attribute.** A support application might own contact preferences while a billing system owns billing status. Loading whichever system ran last can make attributes oscillate.

**Ordering represents the intended current state.** A delayed June event should not replace a July value merely because it arrived later. Establish ordering using a reliable source sequence or revision, with rules for ties and conflicts. Future-effective changes also need a policy about when they become current.

**Missing fields have defined meanings.** In a partial update, an omitted phone number can mean “leave unchanged.” An explicit null might mean “clear the number.” Treating both as a replacement null loses information; always keeping the previous non-null value can block legitimate clearing.

These rules belong before or within the update operation. Type 1 describes the history policy; it does not supply identity resolution, source precedence, or event ordering.

## A documented implementation: dbt incremental merges

dbt documents a concrete current-state example involving customers Alice and Bob. Both begin with `trial` status. Alice later becomes `active`.

With an incremental `merge` strategy and customer ID as the unique key, the next run replaces Alice’s matching row. Bob remains unchanged. Alice’s earlier trial status is no longer stored in that table. [dbt: Choosing incremental models or snapshots](https://docs.getdbt.com/best-practices/how-we-handle-cdc/2-choosing-incremental-or-snapshots)

This implements the Type 1 mechanism, but incremental processing alone does not guarantee it. The model needs matching keys and an update-capable strategy. dbt’s documentation also warns that duplicate matching keys can cause problems, depending on the database and strategy. [dbt: Configure incremental models](https://docs.getdbt.com/docs/build/incremental-models)

For mixed policies, supporting adapters offer controls such as `merge_update_columns` to restrict which columns are overwritten. That helps protect attributes intended to remain fixed. [dbt: Incremental strategies](https://docs.getdbt.com/docs/build/incremental-strategy)

## Historical versions need consistent treatment

A dimension can contain Type 1 attributes alongside Type 2 attributes.

Suppose customer segment changes create historical versions, while corrected display names use Type 1. Updating only the newest row leaves older facts displaying the obsolete name.

For an attribute intended to have one current or corrected value across the entity’s history, update every relevant dimension version associated with that durable entity. Kimball’s SQL example explicitly matches the business key and updates all matching rows for its Type 1 attribute. [Kimball Group: Using SQL MERGE for SCD processing](https://www.kimballgroup.com/2008/11/design-tip-107-using-the-sql-merge-statement-for-slowly-changing-dimension-processing/)

If the requirement is to preserve both historical and current classifications, use separately named attributes or views with explicit semantics.

## A small update can require a large refresh

Type 1 saves dimension storage and avoids version-management work for overwritten attributes. Those benefits do not make every change inexpensive.

A territory update may affect years of sales grouped by territory. Any stored aggregate that has already summarized those facts into East must be recomputed or adjusted appropriately. Refresh dependent extracts, semantic models, and caches as needed so detailed and summarized reports agree. Kimball specifically warns about rebuilding affected aggregates and OLAP results after Type 1 changes. [Kimball Group: Type 1 — Overwrite](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-1/)

Large merges also incur scans and writes. Updating only genuinely changed attributes can reduce unnecessary work.

The larger limitation is reproducibility. A date filter on sales does not recover the dimension values that existed when an earlier report ran. A separate change log or historical source can preserve evidence, but the Type 1 table itself cannot answer that question.

## Choose the reporting perspective deliberately

Use Type 1 for corrected labels, current contact details, and classifications where historical activity should follow the latest accepted assignment. Avoid relying on it for questions that require previous states, event-time ownership, or a reproducible past reporting view.

[[data-retain-original-values-scd-type-0|Retain Original Values — SCD Type 0]] preserves a starting point instead of replacing it. **SCD Type 2** preserves successive versions for historical analysis. [[data-separate-source-facts-from-derived-interpretations|Separate Source Facts from Derived Interpretations]] helps keep an overwritten reporting model rebuildable from retained evidence. [[data-conformed-dimensions|Conformed Dimensions]] extends the responsibility across business processes: shared attributes need compatible meanings and coordinated refreshes wherever they are used.
