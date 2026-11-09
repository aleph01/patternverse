---
id: data-distribution-monitoring
type: pattern
title: Distribution Monitoring
summary: "Monitor how values are spread across a dataset, revealing shifts in ranges, categories, or missingness that normal row counts and averages can conceal."
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

The daily feed arrives on time. Its row count is normal, every field passes schema validation, and the average delivery duration remains thirty minutes.

Yet half the deliveries now take fifty minutes.

**Distribution Monitoring tracks how values are spread across a dataset and detects meaningful changes in that spread.** It examines numerical shape, category proportions, missingness, and unusual concentrations that simple totals or averages can conceal.

Its purpose is to reveal changes that deserve investigation. A shifted distribution can indicate broken transformations, changed customer behavior, altered sampling, or a new operating environment. Detecting the shift does not establish its cause.

## Compare the shape, not only the summary

A distribution describes how frequently values occur.

For numerical fields, useful observations include quantiles, histograms, zero rates, and the share exceeding meaningful thresholds. For categorical fields, examine category proportions, newly appearing values, and the concentration of records in a small number of categories.

Track missing and invalid values separately. A numerical distribution calculated only over successfully parsed values can look stable while an increasing share of records disappears from the calculation.

Every comparison needs a defined population, window, unit, processing stage, and reference. Comparing raw amounts in cents with transformed amounts in dollars produces a dramatic but unsurprising shift.

The reference might be an approved historical period, comparable weekdays, or the training dataset associated with a deployed model. Its identity belongs in the monitoring result.

## Example: the average hides a split

Consider two deliberately simplified batches of one thousand delivery durations.

In the reference batch, every duration is thirty minutes. In the current batch, five hundred are ten minutes and five hundred are fifty minutes.

Both batches have the same count and mean. Their customer experiences differ substantially.

![Distribution monitoring comparing two batches of one thousand delivery durations. The reference contains one thousand observations at thirty minutes. The current batch contains five hundred observations at ten minutes and five hundred at fifty minutes. Both means are thirty minutes, but the share exceeding forty minutes rises from zero to fifty percent.](../assets/data-engineering/distribution-monitoring.svg "Both datasets contain 1000 values with mean 30. Reference values are all 30. Current values are 500 tens and 500 fifties, so half exceed 40 despite the unchanged mean. This deliberately simple example demonstrates a distribution shift.")

*The mean conceals the split. A histogram and a meaningful tail threshold expose it.*

The change could reflect a new delivery service, a regional disruption, or a timestamp calculation defect. Segmenting by carrier, region, and software version helps distinguish those explanations.

Check the population too. Durations calculated only for completed deliveries can appear reassuring while unfinished deliveries accumulate. Monitor completion coverage alongside the duration distribution.

For distributed measurements, retain mergeable distribution summaries rather than averaging worker percentiles. Prometheus documents that precomputed summary quantiles cannot be aggregated into an overall quantile, while histograms retain bucketed observations that can be aggregated appropriately. [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Example: valid categories change their proportions

A payment feed permits `card`, `cash`, and `unknown`. After a mapping deployment, the proportions change:

| Payment category | Reference | Current |
|---|---:|---:|
| Card | 70% | 35% |
| Cash | 25% | 25% |
| Unknown | 5% | 40% |

Every value remains allowed by the schema. Total volume may also remain unchanged. A category-membership check passes.

Distribution monitoring reveals that `unknown` increased by thirty-five percentage points while `card` fell by the same amount. That pattern suggests inspecting the mapping, although a source or population change could also explain it.

Preserve the complete category universe when comparing windows. A category absent from the current data should have an observed count of zero when measurement succeeded; it should not disappear from the comparison.

Keep missing values distinct from an explicit `unknown` category unless the contract intentionally combines them. Likewise, collecting only the most frequent categories can hide a growing tail of unfamiliar values.

An actionable alert names the categories driving the difference. A single distance score is less useful without that explanation.

## Example: model inputs no longer resemble their reference

A demand model was trained on transactions in which 60% came from mobile customers. After an application release, mobile records represent 90% of the serving inputs.

This might be genuine channel growth. It might also mean that the web collector stopped sending events. The observed input distribution cannot distinguish the two.

Compare both the overall mix and behavior within channels. A changed mixture can move the aggregate distribution even when each channel remains stable.

TensorFlow Data Validation provides a verified implementation of these comparisons. It supports drift checks between datasets from different days and skew checks between training and serving data. Its documented comparators include categorical L-infinity distance and Jensen–Shannon divergence for numerical and categorical features. It also supports statistics over configured data slices. [TensorFlow Data Validation](https://www.tensorflow.org/tfx/data_validation/get_started#checking_data_skew_and_drift)

Compare equivalent representations. Raw training features and normalized serving features are not interchangeable reference populations.

A detected input shift does not prove that prediction quality declined. Evaluate outcomes when labels become available, and investigate whether the feature-processing contract changed. Conversely, stable individual feature distributions do not guarantee stable relationships between features and outcomes.

## Choose a comparison that matches the data

Start with interpretable measurements: changes in missingness, category share, important quantiles, and threshold exceedance. These often explain the operational significance more directly than a composite score.

For a broader comparison, select a method whose assumptions fit the population.

A two-sample Kolmogorov–Smirnov test compares empirical cumulative distributions. SciPy documents its standard formulation for independent samples from continuous distributions. Repeated observations from the same customer, heavily rounded measurements, or overlapping windows require care rather than automatic application of its usual significance interpretation. [SciPy two-sample KS test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html)

Jensen–Shannon comparisons can work with aligned category shares or histogram probabilities. Both sides need the same category ordering or numerical bin boundaries. SciPy’s implementation returns **distance**, the square root of Jensen–Shannon divergence; thresholds for the two quantities are not interchangeable. [SciPy Jensen–Shannon distance](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.distance.jensenshannon.html)

Do not independently choose bins for each window and then compare bucket positions as though they represent the same values.

## Make change meaningful before making it urgent

A statistical difference and an operationally important difference are separate judgments.

With large samples, a small shift may be detectable but immaterial. With small samples, a consequential change may remain uncertain. Retain sample sizes and use minimum evidence requirements alongside effect-size thresholds.

Thresholds should reflect the field’s meaning and historical variability. A small increase in an explicit error category may matter more than a larger change in a marketing channel.

Account for seasonality, promotions, product launches, and population changes. Compare windows at equivalent stages of arrival so late data does not create a predictable apparent shift.

Monitoring many features and slices also creates many opportunities for false alarms. When using hypothesis tests at scale, use an appropriate multiple-testing policy; statistical libraries provide explicit correction methods rather than treating every unadjusted result as an independent incident. [Statsmodels multiple-testing corrections](https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html)

Keep approved reference periods versioned. A continuously moving baseline can gradually absorb a persistent defect, while a permanently fixed baseline can become irrelevant after a legitimate business change.

## Investigate without erasing the evidence

A useful alert includes the current and reference populations, measurement versions, sample sizes, leading category or bucket changes, missingness, and affected segments.

Look first for changes in extraction filters, joins, units, default values, deduplication, and source coverage. Then examine business explanations.

Do not automatically delete outliers or replace unusual values merely to restore the reference shape. Rare observations may be the most important part of the dataset. If a known contract is violated, handle that violation through explicit validation and quarantine.

## Costs and limits

Distribution monitoring is useful for shared analytical datasets, external feeds, operational measurements, and model features.

Its costs include scans, distinct counts, histogram storage, statistical computation, and investigation. Sampling and sketches reduce work but introduce uncertainty and can miss rare segments. Preserve their configuration and approximation limits.

Univariate monitoring can miss changes in relationships between fields. Coarse bins can conceal movement within a bucket. Stable distributions can even coexist with records assigned to the wrong entities.

[[data-schema-validation-boundaries|Schema Validation at Boundaries]] establishes allowed representations. [[data-volume-monitoring|Volume Monitoring]] reveals population-size changes. [[data-segmented-quality-checks|Segmented Quality Checks]] separates mixture changes from shifts within groups. [[data-business-invariant-checks|Business Invariant Checks]] tests relationships that should hold regardless of historical distributions.
