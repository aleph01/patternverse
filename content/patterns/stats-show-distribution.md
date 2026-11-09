---
id: stats-show-distribution
type: pattern
title: 'Show the Distribution Behind the Average'
summary: 'Inspect shape, spread, subgroups, and relevant tails before treating one summary as the whole story.'
status: published
verses:
  - statistics
---

Two delivery services both average three days. One delivers almost everything in three days. The other delivers half the parcels in one day and half in five. A customer who needs predictable timing would not regard them as equivalent.

An average compresses observations into one number. That compression is useful when it preserves the information required by the question. The pattern is to inspect the distribution and choose summaries that reveal the aspects relevant to the decision: location, spread, shape, tails, and possible mixtures.

## Interactive example

![One dataset has mean 13.64, median 12, and maximum 35.](../assets/statistics/stats-distribution-preview.svg 'One genuine extreme value can move the mean much more than the median. The appropriate summary depends on the question; numerical influence does not prove a recording error.')

The three bars summarize the same eleven observations. The worked example below shows the values and arithmetic. Run the example to change the extreme value; Reset restores 35.

```patternverse-widget
{
  "src": "stats-distribution.html",
  "title": "Mean and median explorer",
  "height": 720,
  "fallback": "One genuine extreme value can move the mean much more than the median. The appropriate summary depends on the question; numerical influence does not prove a recording error."
}
```

## Worked example: the same data, three summaries

The explorer starts with eleven fictional values: **9, 10, 10, 11, 11, 12, 12, 13, 13, 14, and 35**. They total 150, so the mean is **150 / 11 ≈ 13.64**. The median is the sixth value in this ordered list, **12**, and the maximum is **35**. The three bars describe this one dataset.

Change only 35 to 200. The total rises by 165 to 315, so the mean becomes **315 / 11 ≈ 28.64**. The middle value remains 12. This shows why a genuine extreme can move the mean much more than the median. It does not show that the extreme is an error, or that the median always answers the right question.

## Start with the individual values

For small datasets, a dot plot can show every observation. For larger datasets, a histogram groups values into ranges and shows how many fall in each. A density display smooths the shape. A cumulative plot shows the share at or below each value, such as the share of deliveries completed by day three. Each has choices that affect what becomes visible. Try sensible bin widths, show sample sizes, and avoid interpreting every bump in a small sample as a genuine population cluster.

For the delivery example, a cumulative plot makes it easy to compare the percentage delivered by each deadline. A median alone would still hide some distinctions. A high percentile might suit a service guarantee, while the mean could matter for total inventory costs. There is no universally best summary independent of purpose.

A second example is employee salaries. A few large salaries can pull the mean above what most employees earn. The median answers a typical-position question; the mean answers a per-person total-payroll question. Both can be useful if named honestly.

## Look for mixtures without inventing them

A pooled distribution may combine locations, account types, or time periods with different characteristics. Compare relevant groups when substantive knowledge suggests a mechanism. A two-peaked distribution might reflect two processes, but it might also reflect random variation or a plotting choice.

Group comparisons need common scales and meaningful denominators. A histogram with more cases in one group does not by itself indicate a higher event rate. A narrow axis can exaggerate a small difference, while an overly broad axis can conceal an important one. Show units and the range relevant to the question.

## Advanced notes: variation and uncertainty differ

The spread of individual observations is different from uncertainty about their average. With many observations, the average can be estimated precisely even when individual outcomes remain highly variable. A confidence interval around the mean should not be read as an interval containing most individual cases.

Likewise, a distribution plot describes the observed data. Generalizing to a population requires attention to sampling, missingness, dependence, and measurement. An attractive plot does not certify those assumptions. Include the context needed to interpret the observations.

Use multiple complementary views when they reveal different features: a distribution for overall shape, a grouped plot for a plausible mixture, and a time plot for sequence. A single “summary dashboard” may lose all three.

The interactive distribution example lets you move a genuine extreme value and compare its effects on the mean and median. It illustrates the behavior of summaries; it does not choose which summary answers your question. Begin with that question, then select a representation whose omissions you can explain.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/eda/eda.htm)
