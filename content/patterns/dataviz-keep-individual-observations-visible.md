---
id: dataviz-keep-individual-observations-visible
type: pattern
title: Keep Individual Observations Visible
summary: Keep cases visible when group summaries conceal variation, repeated values, or unusual observations.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Retain individual observations when readers need to inspect what an aggregate has compressed.

```patternverse-widget
{
  "src": "dataviz-keep-individual-observations-visible.html",
  "title": "Keep Individual Observations Visible explorer",
  "height": 700,
  "fallback": "Group A contains 2, 4, 6, 8, and 10 minutes; B contains 5, 5, 6, 7, and 7. Both means are 6, while their spreads differ. Dot offsets separate duplicate values without changing their horizontal measurement."
}
```

## What to notice

Both groups have a mean of 6 minutes. In **Means only**, their hollow diamonds occupy the same horizontal position. That equality is real, but incomplete.

Choose **Show cases**. Group A ranges from 2 to 10, while B concentrates between 5 and 7. The two repeated fives and two repeated sevens in B become visible through small vertical offsets. Those offsets only separate marks; their horizontal positions preserve the recorded waiting times. The mean diamonds remain as orientation.

## Useful when

Use this for small or moderate samples, matched cases, or questions where exceptions and subgroup structure matter. Showing the observations also lets readers see how much evidence supports a summary.

## Watch out for

Overlapping dots can conceal repeated values. Use controlled offsets, transparency, or another appropriate representation, and explain any displacement. Do not jitter a meaningful measurement axis carelessly. With very large datasets, a distribution or aggregate may communicate more clearly; retain access to underlying cases rather than forcing every mark into the foreground.

## Related patterns

[[dataviz-show-the-distribution|Show the Distribution]] [[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]]

## Sources

- [Claus Wilke: Boxplots Violins](https://clauswilke.com/dataviz/boxplots-violins.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/dot)
