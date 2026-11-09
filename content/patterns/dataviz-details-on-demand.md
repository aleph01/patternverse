---
id: dataviz-details-on-demand
type: pattern
title: Details on Demand
summary: Reveal exact values and supporting context when a reader selects an observation.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Reveal exact values and supporting context when a reader selects an observation.

```patternverse-widget
{
  "src": "dataviz-details-on-demand.html",
  "title": "Details on Demand explorer",
  "height": 800,
  "fallback": "The overview shows twelve requests by hours and completed tasks. Select a case to retrieve its identifier, region, exact values, and note; hover or tap a point for a tooltip. The table preserves all observations regardless of selection."
}
```

## What to notice

**Overview** keeps the chart uncluttered while showing all twelve requests. Hover or tap a point to inspect its recorded values.

Choose **Show details** and use the **Case** selector. A ring identifies that request and a persistent text account shows its region, hours, completed tasks, and note. Choosing a different case updates both the ring and account. The selector supplies a keyboard-operable route to the same records without requiring precise pointing. The full table remains available below the chart.

## Useful when

Use this when extra fields help explain individual cases but displaying every label at once would obscure the overall pattern. Keep the most important takeaway visible without interaction, and make selected details easy to inspect and compare.

## Watch out for

Tooltips alone are fragile on touch devices and for keyboard users. Provide a persistent alternative and avoid hiding essential qualifications behind hover. Selection should be unambiguous when points overlap. Details describe a record, not necessarily the reasons behind it: here, completed tasks do not measure difficulty or quality. Keep identifiers consistent across the plot, account, and table.

## Related patterns

[[dataviz-label-directly|Label Directly]] [[dataviz-provide-an-equivalent-text-account|Provide an Equivalent Text Account]]

## Sources

- [Further reading: Interactive Dynamics for Visual Analysis](https://idl.uw.edu/papers/interactive-dynamics)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/interactions)
