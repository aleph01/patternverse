---
id: dataviz-compare-against-a-reference
type: pattern
title: Compare Against a Reference
summary: Place a justified benchmark beside the observations so readers can interpret their departures.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Put the relevant target, baseline, or expected level in the same view as the values it helps interpret.

```patternverse-widget
{
  "src": "dataviz-compare-against-a-reference.html",
  "title": "Compare Against a Reference explorer",
  "height": 700,
  "fallback": "Daily output is 72, 85, 64, and 91 units. Against a target of 80, only Tuesday and Thursday exceed the reference. Adding the target changes no observation."
}
```

## What to notice

Choose **Show target**. The line at 80 units turns four isolated output figures into a comparison: Tuesday exceeds the target by 5 units and Thursday by 11; Monday and Wednesday fall short by 8 and 16.

None of the counts changes. The reference supplies context for the question being asked. A previous period, a contractual target, or an equality line could serve the same role when it has a defensible meaning.

## Useful when

Use a reference when readers ask whether a value is above expectation, within a target, or different from a relevant starting point. Keep the benchmark labeled and visually distinct from observations.

## Watch out for

The line is an explicitly fictional operational target, not a confidence limit. In real work, name the benchmark and explain its basis. A convenient average may be an unsuitable goal. Crossing a target does not by itself establish a meaningful effect or explain its cause.

## Related patterns

[[dataviz-align-for-comparison|Align for Comparison]] [[dataviz-show-uncertainty|Show Uncertainty]]

## Sources

- [Claus Wilke: Visualizing Amounts](https://clauswilke.com/dataviz/visualizing-amounts.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/rule)
