---
id: dataviz-small-multiples
type: pattern
title: Small Multiples
summary: Repeat a consistent visual structure across subsets to compare patterns without excessive overlap.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Give each subset its own comparable panel when overlaying everything makes the patterns difficult to follow.

```patternverse-widget
{
  "src": "dataviz-small-multiples.html",
  "title": "Small Multiples explorer",
  "height": 700,
  "fallback": "North rises from 10 to 25, East falls from 25 to 10, and West rises from 12 to 24. Repeated panels use the same month and zero-to-35 scales to separate their trajectories."
}
```

## What to notice

The **Overlay** places three regional trajectories on the same axes. Switch to **Small multiples** to give North, East, and West separate panels.

Every panel retains the same months, zero-to-35 vertical range, and regional identity. North rises before dropping in April, East declines throughout, and West has a smaller March dip. Separation makes each trajectory inspectable while shared scales preserve the possibility of comparing levels. The data table contains the same twelve observations in either layout.

## Useful when

Use this when comparing distributions, trajectories, maps, or relationships across several groups. Repeat the visual grammar and keep panel ordering purposeful so readers learn the structure once.

## Watch out for

More panels consume space, especially on a phone. Show a manageable set or support filtering. Independent scales may help inspect shapes but weaken magnitude comparisons; make that choice explicit. Small multiples also separate marks that are useful to compare through direct coincidence, so an overlay can remain preferable for a small number of compatible series.

## Related patterns

[[dataviz-align-for-comparison|Align for Comparison]] [[dataviz-label-directly|Label Directly]]

## Sources

- [Claus Wilke: Multi Panel Figures](https://clauswilke.com/dataviz/multi-panel-figures.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/facets)
