---
id: data-segmented-quality-checks
type: pattern
title: Segmented Quality Checks
summary: "Evaluate data quality within meaningful groups as well as overall, so a large healthy segment cannot hide failures in a smaller one."
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

The daily quality report is green: customer IDs are present on more than 99.5% of orders. Yet one partner’s support team cannot identify the customer on one order in five.

Both observations are correct. The partner contributes too little volume to move the overall score very far.

**Segmented Quality Checks evaluate data quality within meaningful groups as well as across the whole dataset.** They expose failures concentrated in a source, tenant, region, product, schema version, or processing path.

Their purpose is to keep a healthy majority from concealing a damaged minority—and to connect each failure with the population and owner affected.

## Apply the rule where failure can concentrate

A dataset-wide metric usually weights records equally. Large populations dominate its result.

That is appropriate when describing the whole dataset. It is insufficient when independently operated feeds or business groups need their own guarantees.

The mechanism is:

**Define eligible records → assign segments → evaluate each rule → retain counts, rates, and coverage → act on the affected scope.**

Segmentation changes where a rule is evaluated. It does not replace the rule’s business meaning.

For example, “customer ID present” might mean non-null after an agreed blank-value normalization. It does not establish that the ID references an existing customer. Keep those assertions separate.

## Example: an overall pass hides a source failure

A batch contains one million eligible orders. The web source contributes 990,000; a partner contributes 10,000.

The web source has 990 missing customer IDs. The partner has 2,000.

![Segmented quality checks showing overall customer-ID completeness of 99.701% across one million eligible orders. The web source is 99.9% complete and passes an illustrative 99.5% threshold. The partner source is only 80% complete and fails, despite the overall pass.](../assets/data-engineering/segmented-quality-checks.svg "One million orders have 2990 missing values, yielding 99.701% completeness and passing a 99.5% threshold. Web is 99.9% complete, while a 10000-order partner segment is only 80% complete.")

*The overall metric describes all records accurately. The source-level check reveals where the problem is concentrated.*

Overall completeness is 99.701%, exceeding the illustrative operating threshold of 99.5%. The partner’s completeness is only 80%.

The source-level result immediately narrows investigation: inspect the partner mapping, contract version, and recent changes. It also identifies the affected delivery population.

Retain eligible and failing counts alongside percentages. Two thousand missing IDs explain the scale of the incident more clearly than a percentage alone.

If a field is strictly mandatory, a tolerance-based operating threshold does not establish full compliance. The exception budget and the underlying business requirement are different policies.

Overall rates should be calculated from their underlying counts. Averaging the two source percentages would give equal weight to populations of very different sizes and produce a different measure.

## Choose segments that explain responsibility and meaning

Useful segment dimensions often correspond to independent failure paths: source system, connector, file type, application version, or deployment cohort.

Business dimensions reveal concentrated impact: tenant, country, product family, channel, or service tier.

Start with a small set supported by recognizable failure scenarios. A rule-by-segment matrix should be understandable enough that an operator can explain why each check exists.

Applicability matters. Guest purchases might legitimately lack a registered customer ID, while account purchases require one. Define eligibility before calculating completeness; otherwise, a change in the guest-purchase share can look like deteriorating quality.

Keep missing segment keys visible. Grouping only records with a known source can remove exactly the records whose lineage broke. Use an explicit “unassigned” outcome and investigate it separately.

Version segment definitions when mappings change. Moving records between regions can alter historical comparisons without changing any record’s validity.

## Example: a required tenant disappears entirely

A multi-tenant export must deliver one partition for each contracted tenant every morning.

Today, nineteen tenants arrive and pass every field check. The twentieth is absent.

A query that groups the received records by tenant returns nineteen healthy groups. There is no failed group for the missing tenant because there is no group at all.

Coverage therefore needs an independent expected population: the contracted tenants and their effective delivery schedules. Compare that inventory with observed deliveries.

The absent tenant should produce a missing-delivery result, not vanish from the report. Distinguish it from a tenant whose source explicitly confirmed a complete, zero-record delivery.

The same issue affects rules applied through filters. dbt’s generic data-test `where` configuration restricts the resource before the test runs. This supports scoped checks, but a filtered test does not establish that its intended population exists. [dbt test filtering](https://docs.getdbt.com/reference/resource-configs/where)

A uniqueness check filtered to one tenant also proves only the scoped assertion. It cannot establish uniqueness across tenants if the business key is meant to be global.

## Example: an intersection reveals a feature defect

A model-input pipeline has acceptable address-feature completeness overall. Checking by country looks healthy. Checking by device type also looks healthy.

However, mobile records from one smaller country have a high missingness rate following a client release. Neither broad grouping isolates that intersection clearly enough.

Check selected combinations such as `(country, device_type)` where there is a plausible shared failure mechanism. Compare equivalent feature representations and retain the release version for diagnosis.

TensorFlow Data Validation provides a concrete implementation of slicing. Its documented configuration supports individual feature values and crosses such as country and state, producing statistics for each slice alongside the overall dataset. [TFDV statistics over slices](https://www.tensorflow.org/tfx/data_validation/get_started#computing_statistics_over_slices_of_data)

Do not generate every possible intersection automatically. Combinations grow rapidly, many contain little data, and overlapping slices count the same record more than once. Their counts cannot simply be added into a dataset total.

Use broad checks for coverage and selected intersections for known risks or investigation.

## Keep rule semantics consistent

A shared rule should have a shared definition, including null handling, blank strings, units, time boundaries, and eligible records.

Tool names alone are insufficient. AWS Glue supports filtered completeness checks, but its documentation notes that blank CSV string fields may remain empty strings rather than nulls. A non-null completeness rule can therefore behave differently from a business rule requiring a nonempty identifier. [AWS Glue IsComplete](https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types-IsComplete.html)

Likewise, source-specific thresholds may be justified by different contracts or delivery schedules. Record that justification. Quietly relaxing a threshold for the worst-performing group hides the failure rather than explaining it.

For time-based checks, compare groups against their own legitimate schedules. A weekly reference feed should not inherit a five-minute threshold intended for transaction events.

## Treat small groups carefully

One failure among five records produces a 20% failure rate. That may describe a real defect, but it is weak evidence about a stable long-run rate.

For statistical expectations, retain sample size, use suitable uncertainty handling, and consider longer windows where the business can tolerate delayed detection. Mark insufficient evidence explicitly rather than reporting a confident pass.

Hard rules require different treatment. One prohibited reference or invalid settlement can matter even in a tiny segment. A minimum sample-size policy should not suppress a known violation.

Use both rates and absolute impact. Low-volume segments may serve important customers, and a low overall error rate may still represent thousands of affected records.

Changes in population mix can also improve the overall score while individual groups deteriorate. Keep group-level trends alongside the aggregate.

## Connect each failure to a response

Store the rule version, segment definition, dataset version, window, eligible count, failure count, threshold, and representative evidence.

Give failures an owner and a consequence: investigate, hold a partition, quarantine affected records, or block publication. Scope isolation only as narrowly as business dependencies permit. A broken segment may participate in totals or relationships that require a broader hold.

Group related alerts when one source defect produces many symptoms. Monitoring hundreds of nearly identical failures should not create hundreds of independent incidents.

Costs include scans, grouping, stored results, and operator attention. Reuse shared computations where possible. Prometheus warns that every additional label combination creates a time series with resource costs; detailed slice analysis may belong in an analytical store rather than the operational metrics system. [Prometheus label guidance](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels)

## What segmentation can establish

This pattern is especially useful for shared platforms, multiple source feeds, regional reporting, migrations, and heterogeneous model inputs.

It establishes quality for the groups and rules actually examined. Unchecked intersections, incorrect eligibility, and missing expected groups remain blind spots.

[[data-volume-monitoring|Volume Monitoring]] detects absent or unusual populations. [[data-freshness-monitoring|Freshness Monitoring]] exposes delayed segments. [[data-distribution-monitoring|Distribution Monitoring]] reveals changes in values within groups. [[data-quarantine-invalid-records|Quarantine Invalid Records]] provides a recovery path for records that fail their applicable checks.
