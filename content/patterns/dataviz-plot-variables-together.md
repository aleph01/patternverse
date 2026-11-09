---
id: dataviz-plot-variables-together
type: pattern
title: Plot Variables Together
summary: Place matched variables on shared axes to reveal relationships among their paired observations.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Give each paired observation a position determined by both variables when the question concerns their relationship.

```patternverse-widget
{
  "src": "dataviz-plot-variables-together.html",
  "title": "Plot Variables Together explorer",
  "height": 700,
  "fallback": "Practice hours 1, 2, 3, 4, 5, and 6 pair with 2, 3, 5, 4, 7, and 8 completed tasks. A scatterplot preserves each pair and reveals a generally rising association, without establishing causation."
}
```

## What to notice

The **Separate lists** show hours of practice and completed tasks for the same six participants. Each list is readable, but judging association requires repeatedly finding a person in both charts.

Choose **Paired axes**. Participant A becomes the point at 1 hour and 2 tasks; F lies at 6 hours and 8 tasks. The cloud generally rises with practice hours, while D's four tasks interrupt a perfectly increasing sequence. Every point retains its case identity and both original measurements.

## Useful when

Use this when investigating whether two quantitative variables vary together, whether groups occupy different regions, or which cases depart from a relationship. Label units on both axes.

## Watch out for

An association does not identify its cause. Selection, confounding, or a third variable could produce the observed pattern. Six fictional cases demonstrate an encoding, not a reliable population finding. Dense point clouds need overlap handling, and a fitted line should not replace inspection of the observations or imply unsupported predictions.

## Related patterns

[[dataviz-show-paired-differences|Show Paired Differences]] [[dataviz-keep-individual-observations-visible|Keep Individual Observations Visible]]

## Sources

- [Claus Wilke: Visualizing Associations](https://clauswilke.com/dataviz/visualizing-associations.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/dot)
