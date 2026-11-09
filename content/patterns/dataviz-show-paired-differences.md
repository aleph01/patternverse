---
id: dataviz-show-paired-differences
type: pattern
title: Show Paired Differences
summary: Preserve matched identities and show the change for each case, rather than only comparing group summaries.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Connect measurements from the same case, or plot their differences, when the question concerns individual change.

```patternverse-widget
{
  "src": "dataviz-show-paired-differences.html",
  "title": "Show Paired Differences explorer",
  "height": 700,
  "fallback": "Before/after pairs are 12/15, 18/16, 8/14, and 20/21. Their changes are +3, −2, +6, and +1 points; the mean change is +2. Matching preserves the identity of each case."
}
```

## What to notice

In **Paired values**, hollow marks show the before score and filled marks the after score for each case. P1 rises from 12 to 15, while P2 falls from 18 to 16. The connectors preserve which measurements belong together.

Switch to **Differences** to read after minus before directly: +3, −2, +6, and +1 points. The mean change is +2, but that summary conceals the decline in P2 and the larger increase in P3.

## Useful when

Use this for repeated measurements, matched comparisons, revisions, or two measurements of the same object. Retain the case identifier so the relation remains inspectable in the data table.

## Watch out for

Pairs must be genuinely matched. Connecting unrelated cases creates a false relationship. Difference plots make change easy to compare but hide starting levels, so preserve the original values nearby. These four fictional pairs do not establish that an intervention caused their changes.

## Related patterns

[[dataviz-keep-individual-observations-visible|Keep Individual Observations Visible]] [[dataviz-plot-variables-together|Plot Variables Together]]

## Sources

- [Claus Wilke: Visualizing Associations](https://clauswilke.com/dataviz/visualizing-associations.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/rule)
