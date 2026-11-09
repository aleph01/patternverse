---
id: dataviz-condition-on-groups
type: pattern
title: Condition on Groups
summary: Inspect relationships within meaningful groups before interpreting the pooled pattern.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Inspect relationships within meaningful groups before interpreting the pooled pattern.

```patternverse-widget
{
  "src": "dataviz-condition-on-groups.html",
  "title": "Condition on Groups explorer",
  "height": 800,
  "fallback": "Context A pairs hours 1, 2, 3 with scores 8, 9, 10. Context B pairs hours 7, 8, 9 with scores 2, 3, 4. The pooled association is negative, although the association within each context is positive. Neither view establishes causation."
}
```

## What to notice

The **Pooled** view suggests that more hours accompany lower scores. Its line summarizes all six fictional cases together.

Switch to **Separate groups**. In context A, scores rise from 8 to 10 as hours rise from one to three. In context B, scores rise from 2 to 4 as hours rise from seven to nine. Both within-group slopes are positive. The pooled slope is negative because the two contexts occupy different parts of the chart. The dots have not moved; their group membership has become visible.

## Useful when

Use this when cases come from different environments, populations, operating conditions, or periods. Compare a pooled relationship with justified subsets, using color, facets, or filters while keeping compatible axes.

## Watch out for

Do not invent groups solely to obtain a preferred result. Small subsets may be unstable, and further differences may remain within each group. A reversal like this illustrates an aggregation problem; it does not identify a causal explanation. Conditioning can itself distort causal interpretation when the chosen variable is inappropriate.

## Related patterns

[[dataviz-plot-variables-together|Plot Variables Together]] [[dataviz-small-multiples|Small Multiples]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/visualizing-associations.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/linear-regression)
