---
id: data-operational-service-objectives
type: pattern
title: Operational Service Objectives
summary: "Define measurable targets for data-service behavior, evaluate them over a stated period, and use the allowed shortfall to guide operational decisions."
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

The pipeline dashboard is green, but the planning team cannot use this morning’s inventory. Yesterday’s data is still published, one supplier is missing, and nobody knows whether the delay warrants an incident or can wait until tomorrow.

“Keep the pipeline healthy” leaves too much unresolved.

[[data-operational-service-objectives|Operational Service Objectives]] define measurable targets for the service a data product provides: when data becomes usable, which population it covers, and what reliability consumers can expect. They connect those targets to ownership, monitoring, and operational decisions.

The purpose is to replace an ambiguous health judgment with a shared answer: **are consumers receiving the service they need, and what should happen when they are not?**

## Start with the consumer’s dependency

A useful objective describes an outcome people depend on.

“Every scheduled job succeeds” measures execution. “The reconciled inventory for every required warehouse is available by 08:00” describes a usable result. A job can succeed while processing an incomplete population; a retry can fail while the published product remains usable.

The standard terminology distinguishes a **service-level indicator**, or SLI, from a **service-level objective**, or SLO. The indicator measures behavior; the objective sets its target. Google’s [Service Level Objectives chapter](https://sre.google/sre-book/service-level-objectives/) establishes this distinction and emphasizes measuring service characteristics that matter to users.

An operational objective needs more than a percentage. Define:

- The consumer, service boundary, and eligible population.
- What counts as a good outcome.
- The target and measurement window.
- How evidence is collected, including missing observations.
- Who responds and which decisions the objective governs.

Select a few consequential objectives. Availability, timeliness, completeness, and correctness answer different questions; an average across them can hide a serious failure.

## Count the events that missed their deadline

Consider this illustrative tracking-feed objective:

> At least 99.9% of accepted logical shipment events become visible in the consumer feed within 120 seconds, measured over a rolling 28-day admission cohort.

The indicator divides events visible within their deadline by all eligible accepted events whose deadlines have passed.

“Logical events” matters: transport retries should not inflate the denominator. “Consumer feed” matters because a broker acknowledgment does not establish that tracking customers can read the update.

![An illustrative 99.9% tracking-feed objective evaluates one million events whose deadlines have passed. Of these, 999,250 arrived within 120 seconds and 750 were late or missing. The indicator is 99.925%; 750 of the 1,000-event error budget has been consumed.](../assets/data-engineering/operational-service-objectives.svg "The objective is 99.9% of eligible records available within 120 seconds over twenty-eight days. Of one million records,999250 arrive on time and 750 miss. Success is 99.925%; the 1000-record miss budget is 75% spent. Missing records count as misses.")

For the illustrated cohort, 999,250 of one million events arrived on time. The indicator is **99.925%**, above the target. The 750 late or missing events still matter operationally.

Build the denominator from authoritative acceptance evidence. Counting only records found at the destination makes missing records disappear from the measurement. Preserve the original deadline outcome when a late record eventually arrives: recovery improves current service but does not make the earlier delivery timely.

## Give batches a calendar and a completeness rule

A daily inventory product needs a different objective:

> At least 99% of scheduled business-day deliveries are complete, reconciled, and published by 08:00 Europe/Berlin over a rolling quarter.

Here, one delivery is the unit of service. Ten retries of the same delivery do not create ten opportunities for success.

“Complete” requires an expected inventory of warehouses or supplier feeds. A table containing no invalid rows may still omit an entire warehouse. An expected zero-record delivery needs affirmative evidence distinguishing it from a missing feed.

The calendar must define holidays, the covered business date, and daylight-saving behavior. Upstream cutoffs also matter. If a supplier arrives late, the consumer-facing product can still miss its objective even when the internal transformation finishes quickly.

Small denominators make percentages coarse. With 65 scheduled deliveries, one miss yields approximately **98.46%**. A seemingly modest 99% target therefore permits no misses in that particular window.

This is a reason to choose targets with consumers, rather than copying percentages from a high-volume API.

## Measure usable reads, including stale responses

A serving interface might meet an availability target while returning old data.

An illustrative objective could require 99.9% of eligible inventory reads to succeed within 500 milliseconds **and** use a complete source cut no more than two minutes old, over 28 days.

A fast response using yesterday’s release fails that definition. So does a fresh result that the authorized consumer cannot access.

Separate indicators can help diagnose latency, freshness, and availability. If the product promises their conjunction, also measure that combined outcome; three independently healthy averages do not establish that individual reads satisfy all three conditions.

Google’s [example SLO document](https://sre.google/workbook/slo-document/) illustrates this distinction with separate pipeline freshness, correctness, and completeness indicators. Its freshness measurement follows reads of the resulting data, connecting the pipeline to its consumers.

Platform metrics remain useful diagnostic evidence. For example, [Dataflow documents data freshness and system latency](https://docs.cloud.google.com/dataflow/docs/guides/using-monitoring-intf) with specific processing boundaries. Check those definitions before treating a platform metric as the end-to-end objective.

## Make the measurement honest

The measurement boundary determines accountability.

Spotify’s case study in Google’s [Data Processing Pipelines chapter](https://sre.google/workbook/data-processing/) describes timeliness and completeness measured from server receipt, avoiding unreliable client timestamps and long offline buffering. It also distinguishes event delivery responsibilities from business-content quality owned by producing teams.

That distinction should be explicit. Delivery within two minutes of platform acceptance is different from visibility within two minutes of the original business event.

Correctness also needs a defined basis. Passing schema and invariant checks establishes compliance with those checks. It cannot establish every aspect of business truth. Canary records and independently calculated samples provide valuable evidence, with coverage limits that should remain visible.

Report important segments separately. High-volume tenants can dominate a global event ratio while a smaller customer experiences persistent failure. Choose meaningful service classes or routes without creating an unmanageable objective for every possible dimension.

Missing telemetry is unknown service quality, not automatic success. Monitor measurement coverage separately. A zero-traffic window has no observed event ratio; synthetic probes can provide an additional signal without silently substituting for real-user evidence.

## Turn the target into response rules

For a ratio objective, the **error budget** is the permitted bad-outcome fraction over its measurement window.

At 99.9%, the illustrated million-event cohort has a budget of 1,000 deadline misses. Its 750 misses consume 75% of that budget, leaving 250 for that cohort. A rolling window changes as events enter and leave; the remaining count is not a permanent allowance.

Burn rate describes the bad-outcome fraction relative to the objective’s tolerance. A recent 0.5% failure ratio against a 0.1% tolerance is a **five-times burn rate**.

Google’s [guidance on SLO alerting](https://sre.google/workbook/alerting-on-slos/) uses multiple windows and burn rates to distinguish urgent budget consumption from slower deterioration. Adapt the thresholds to traffic and consequence: a critical daily delivery may require intervention before its deadline, regardless of a long-window percentage.

Agree on actions in advance. Rapid deterioration may trigger an incident and pause risky releases. Sustained slower loss may prioritize capacity work or dependency repair.

An error budget guides reliability decisions. It does not authorize corrupt output or override mandatory business invariants.

## Assign the tradeoffs to an owner

Tighter objectives cost money and operating effort: more capacity, faster source delivery, redundant infrastructure, additional validation, and more demanding response coverage. Overly loose objectives leave consumers building workarounds and duplicate pipelines.

An accountable owner needs authority to balance those costs against consumer needs. Dependency teams need compatible commitments, while the product still needs an end-to-end objective. Healthy component targets do not automatically compose into a healthy consumer journey.

Review objectives when usage changes, measurement gaps emerge, or incidents reveal misunderstood expectations. Version revisions and preserve historical results; weakening a target retrospectively conceals the experience consumers actually received.

[[data-freshness-monitoring|Freshness Monitoring]] supplies timeliness evidence. [[data-source-to-target-reconciliation|Source-to-Target Reconciliation]] supports completeness and agreement. [[data-end-to-end-canary-records|End-to-End Canary Records]] test selected consumer journeys. [[data-publication-quality-gates|Publication Quality Gates]] enforce release conditions, while operational objectives measure the service delivered over time.
