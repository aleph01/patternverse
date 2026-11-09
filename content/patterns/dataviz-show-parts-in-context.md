---
id: dataviz-show-parts-in-context
type: pattern
title: Show Parts in Context
summary: Keep group totals available when shares and absolute contributions answer different questions.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Show how parts relate to their whole, and preserve total size when a percentage alone could mislead.

```patternverse-widget
{
  "src": "dataviz-show-parts-in-context.html",
  "title": "Show Parts in Context explorer",
  "height": 700,
  "fallback": "A has 40 positive responses out of 100 (40%); B has 90 out of 300 (30%). A has the larger share, while B has the larger positive count. Both statements describe the same observations."
}
```

## What to notice

In **Shares only**, group A has 40% positive responses and B has 30%. Both bars represent a complete group, so they have the same total length.

Switch to **Counts + totals**. A contains 40 positives among 100 responses; B contains 90 among 300. A has the larger positive share, while B contributes more positive responses. The two views answer different questions about the same counts. Green continues to identify positive responses and gray the remaining responses.

## Useful when

Use this for composition, survey results, market shares, or contributions from unequal groups. Decide whether readers need prevalence, workload, or both, then label the measure and denominator clearly.

## Watch out for

Parts must refer to a defined whole. Overlapping categories cannot simply be stacked as exclusive shares, and percentages can conceal changes in group size. Counts do not establish representative sampling or explain why groups differ. Stacked components without a shared baseline can also be difficult to compare precisely; use aligned shares when that comparison takes priority.

## Related patterns

[[dataviz-align-for-comparison|Align for Comparison]] [[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]]

## Sources

- [Claus Wilke: Visualizing Proportions](https://clauswilke.com/dataviz/visualizing-proportions.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/bar)
