---
id: data-periodic-snapshots
type: pattern
title: Periodic Snapshots
summary: "Record measurements at regular intervals, making historical balances and trends available while keeping each period’s observations distinct from business events."
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

A warehouse records every receipt, shipment, and adjustment. Yet a simple question—“How much stock did we have at the end of each day last month?”—requires replaying movements, finding an opening balance, and handling corrections.

Another system exposes only its current inventory. Yesterday’s position disappears when today’s values replace it.

[[data-periodic-snapshots|Periodic Snapshots]] preserves measurements at regular business intervals: daily inventory, weekly backlog, month-end balances, or another agreed cadence. Each period receives its own observation, making trends and comparisons available without reconstructing the entire history for every query.

In dimensional modeling, a periodic snapshot fact table has a period-based grain rather than one row per individual transaction. [Kimball Group: Periodic snapshot fact tables](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/periodic-snapshot-fact-table/)

## Declare exactly what each observation represents

“Daily inventory” is not a complete grain declaration.

A useful statement is:

> One row records the closing stock position of one SKU in one warehouse for one business day.

That establishes the entity combination, measurement, cadence, and intended cutoff.

Additional distinctions may belong in the grain: inventory ownership, stock condition, lot, or unit of measure. Available stock, physically present stock, and reserved stock also need separate definitions.

A snapshot can be captured directly from an authoritative state or calculated from an opening position plus complete movements. Either approach needs a dependable way to establish the position at the chosen cutoff.

The table may also contain period activity, such as units received during the day, when those measures share its declared grain. Each measure still needs its own aggregation rules.

## Example: daily inventory across two warehouses

For one SKU, the closing positions are:

| Closing day | Warehouse A | Warehouse B | Combined stock |
|---|---:|---:|---:|
| June 1 | 12 | 8 | 20 |
| June 2 | 9 | 7 | 16 |
| June 3 | 15 | 10 | 25 |

The underlying snapshot contains six rows: one per SKU, warehouse, and day.

![Diagram showing closing inventory for one SKU across two warehouses on three consecutive days. Location balances sum to 20, 16, and 25 units respectively. The closing position is 25 units; adding the three daily totals to 61 does not produce a closing balance.](../assets/data-engineering/periodic-snapshots.svg "One item has six underlying observations: one per warehouse and closing day. Warehouses A and B are pivoted into columns here. Daily totals 20, 16, 25 cannot be added to obtain closing inventory; the latest total is25.")

*Illustrative data. Both warehouses use the agreed daily cutoff and the same unit of measure.*

The snapshot answers how much stock remained at each close. It does not explain every movement that produced those positions.

That separation is useful: transaction records explain activity; periodic observations make positions easy to compare.

## Balances need a different time aggregation

At June 3 close, adding compatible warehouse balances gives 25 units.

Adding June 1, June 2, and June 3 gives 61. That is not stock on hand at any of the three cutoffs. It combines repeated observations of inventory across time.

Balances are commonly **semi-additive**: summable across appropriate dimensions, while requiring another operation across time. [Kimball Group: Additive, semi-additive, and non-additive facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/)

For this example:

| Question | Appropriate calculation |
|---|---|
| Closing stock for the window | June 3 total: 25 |
| Change from June 1 close | 25 − 20 = 5 |
| Average observed daily closing stock | (20 + 16 + 25) ÷ 3 ≈ 20.33 |

The average describes these daily closing observations. It does not establish the average inventory held continuously throughout each day.

Coverage matters too. Averaging only the dates that loaded successfully can bias a result. Selecting each warehouse’s latest available row can silently combine different cutoffs.

Period flows behave differently. Units received during non-overlapping days can usually be summed across those days, provided definitions and units remain compatible.

## No activity, zero stock, and missing data are different

Periodic snapshots commonly include rows even when no activity occurs during the period. This regular coverage is a defining feature of the dimensional pattern. [Kimball Group: Periodic snapshot fact tables](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/periodic-snapshot-fact-table/)

However, no activity does not imply a zero balance.

If a warehouse has twelve units and nothing changes, its next closing balance remains twelve. Receipts during that period may be zero. A failed extract establishes neither value.

Define the expected population for each cutoff—for example, the SKU–warehouse combinations stocked on that date. Compare expected coverage with observed coverage.

Do not generate zero stock for every possible combination of every product and location. Some combinations are inapplicable; others may be missing or unknown. Carrying a balance forward also requires evidence that this is valid, such as complete movement capture or a trustworthy unchanged source state.

## Capture the intended cutoff, not merely the job’s runtime

A snapshot labeled “June 3 close” must represent that business cutoff. Starting an extraction after midnight does not automatically recover the earlier state.

Separate the intended cutoff, actual source as-of time, capture time, and publication time where they can differ. Use a consistent source snapshot, historical query, or complete event sequence when the cutoff must be reconstructed.

A documented implementation shows why this distinction matters. IBM Store Engagement supports scheduled inventory snapshots through Inventory Snapshot events V2. Its documentation states that an 08:00 snapshot delayed until 10:00 reflects the latest 10:00 inventory and includes the corresponding data timestamp. [IBM: Inventory snapshots](https://www.ibm.com/docs/en/store-engagement?topic=integrating-inventory-snapshots)

That is useful behavior when consumers understand it. Relabeling the result as an 08:00 position would create false precision.

Across several sources, publish a completed snapshot only after its required components have reached the agreed consistency boundary.

## Example: a stable backlog can hide substantial activity

A support team has forty open tickets at Monday close and forty again at Tuesday close.

During Tuesday, it resolves fifteen tickets and receives fifteen new ones.

A periodic backlog snapshot correctly shows an unchanged position. It cannot establish that nothing happened, identify which tickets changed, or reveal a temporary midday surge.

A team-level snapshot can store closing backlog alongside tickets opened and resolved during the day. Ticket events remain necessary for individual journeys and exact transition times.

Kimball’s discussion of workflow snapshots similarly distinguishes periodic observations from transaction records that preserve individual state changes. [Kimball Group: Timespan accumulating snapshots](https://www.kimballgroup.com/2012/05/design-tip-145-time-stamping-accumulating-snapshot-fact-tables/)

Choose the cadence around the questions. A month-end observation cannot reveal a stockout that began and ended between month ends.

## Decide what later corrections should change

Suppose a late inventory adjustment reveals that June 2’s balance was wrong.

Two reporting perspectives are possible:

- The accepted corrected position for June 2.
- The position published in the original June 2 snapshot.

Choose which the dataset promises. If both matter, preserve publication versions or another recorded-time history alongside the business cutoff.

Corrections derived from movement histories may affect several later snapshots, not just the date of the delayed event. Determine the affected range and rebuild consistently.

Routine reruns should also preserve the grain: loading the same cutoff twice must not create duplicate observations. Publish a replacement or a deliberate new version according to the correction policy.

Historical dimension assignments need similar care. Attaching today’s warehouse region to every past snapshot can change historical groupings even when the stock quantities remain unchanged.

## Budget for regular coverage

Storage grows roughly with eligible entity combinations multiplied by retained periods. One million combinations observed daily produces about 365 million rows annually, before revisions.

Partitioning by snapshot period, incremental processing, compression, and summary tables can help. Keeping recent daily observations and older monthly observations reduces volume, but changes the available resolution. Make that boundary explicit.

Periodic snapshots are useful when repeated positions matter, reconstruction is expensive, or sources lack usable movement history. They are less suitable when questions depend on exact intermediate transitions or when an infrequently changing state can be represented more economically with effective intervals.

[[data-declare-the-grain|Declare the Grain]] establishes each observation’s meaning. [[data-transaction-fact-tables|Transaction Fact Tables]] preserves the movements behind the positions. [[data-calendar-dimensions|Calendar Dimensions]] defines reporting periods and business cutoffs. [[data-recorded-time-history|Recorded-Time History]] preserves earlier publications when corrected snapshots must coexist with what users originally received.
