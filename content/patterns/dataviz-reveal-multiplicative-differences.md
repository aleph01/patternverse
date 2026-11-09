---
id: dataviz-reveal-multiplicative-differences
type: pattern
title: Reveal Multiplicative Differences
summary: Use logarithmic position when equal ratios matter more than equal additive differences.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Use logarithmic position when equal ratios matter more than equal additive differences.

```patternverse-widget
{
  "src": "dataviz-reveal-multiplicative-differences.html",
  "title": "Reveal Multiplicative Differences explorer",
  "height": 800,
  "fallback": "Measurements are 1, 10, 100, and 1,000 units. Equal tenfold ratios occupy equal distances on a logarithmic axis. On a linear axis, equal distances represent equal additive differences. Zero and negative values are not supported by this log scale."
}
```

## What to notice

On the **Linear** scale, the measurements 1, 10, and 100 crowd toward the left beside 1,000. Equal horizontal distances represent equal differences in units.

Switch to **Logarithmic**. The four values are evenly spaced because each is ten times the preceding one. A move from 1 to 10 now occupies the same distance as a move from 100 to 1,000. The axis still labels original units; the spacing rule changes. Points avoid implying that bar length measures an amount from zero.

## Useful when

Use this for positive values spanning several orders of magnitude, proportional growth, or comparisons in which a doubling should have the same visual meaning at different levels. Clearly identify the logarithmic scale and label useful original values.

## Watch out for

An ordinary log scale cannot include zero or negative measurements. Do not silently discard them or add an arbitrary constant to make them fit. Equal visual gaps no longer mean equal absolute gains, and readers may need an explicit example. A straight trajectory on a log-scaled time plot indicates multiplicative growth, not a constant additive increase.

## Related patterns

[[dataviz-index-to-a-common-start|Index to a Common Start]] [[dataviz-align-for-comparison|Align for Comparison]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/coordinate-systems-axes.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/dot)
