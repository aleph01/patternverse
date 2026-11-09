---
id: dataviz-compare-cohorts-at-equal-age
type: pattern
title: Compare Cohorts at Equal Age
summary: Compare groups at the same elapsed stage when they entered a process at different times.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Compare groups at the same elapsed stage when they entered a process at different times.

```patternverse-widget
{
  "src": "dataviz-compare-cohorts-at-equal-age.html",
  "title": "Compare Cohorts at Equal Age explorer",
  "height": 800,
  "fallback": "January retention is 100%, 70%, 55%, 45%; March retention is 100%, 80%, 65%, 60%. Both cohorts are observed to age three months. At equal age, March retains more users, although calendar conditions and group composition may differ."
}
```

## What to notice

In **Calendar month**, January and March signup cohorts begin two months apart. Comparing their values in a single calendar month mixes different ages since signup.

Switch to **Months since signup**. Both cohorts begin with 100 users at age zero. At age three months, January retains 45 and March retains 60. All four ages are observed for both groups in this fictional dataset. The aligned view makes their retention comparison direct without changing who belongs to either cohort.

## Useful when

Use this for customer retention, learning progress, equipment survival, or groups entering a process at different dates. Define membership once, state the starting denominator, and compare only ages supported by observations.

## Watch out for

Equal age does not guarantee equivalent conditions. Cohorts may differ in composition or experience different calendar events. Recent cohorts often have incomplete follow-up; leave unavailable ages empty rather than interpreting them as zero retention. Specify whether returning members count as retained and whether the denominator stays fixed. In real survival data, censoring may require methods beyond dividing an observed count by the original cohort size.

## Related patterns

[[dataviz-align-around-an-event|Align Around an Event]] [[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]]

## Sources

- [Further reading: Visualization of Time-Oriented Data](https://timeviz.net/)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
