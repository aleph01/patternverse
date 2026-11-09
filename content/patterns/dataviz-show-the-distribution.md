---
id: dataviz-show-the-distribution
type: pattern
title: Show the Distribution
summary: Expose the shape and spread of observations when a typical value would hide important variation.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Show where observations lie across their range before treating a single average as an adequate account.

```patternverse-widget
{
  "src": "dataviz-show-the-distribution.html",
  "title": "Show the Distribution explorer",
  "height": 700,
  "fallback": "Twelve waiting times have a mean of 7 minutes, but range from 2 to 18. Four-minute bins contain 2, 6, 2, 1, and 1 cases. The same average conceals the tail."
}
```

## What to notice

The **Mean only** view places the average at 7 minutes. Switch to **Distribution** to see twelve waiting times grouped into equal four-minute intervals. Six cases fall between 4 and 8 minutes, while one extends to 18.

The average remains 7 in both views. The histogram reveals concentration and a longer upper tail that the single reference line cannot describe. Its vertical scale counts cases within each bin; the dashed line identifies the mean on the horizontal scale.

## Useful when

Use this when readers need to understand typical experience, exceptional cases, skew, or the range behind an aggregate. Choose a representation that suits the number and kind of observations.

## Watch out for

Bin boundaries affect a histogram. Inspect other reasonable widths before treating a feature as robust, and label counts versus density. These twelve fictional cases illustrate a shape; they do not establish a stable population distribution. Uncertainty about an estimated mean is a separate question from variation among observations.

## Related patterns

[[dataviz-keep-individual-observations-visible|Keep Individual Observations Visible]] [[dataviz-show-uncertainty|Show Uncertainty]]

## Sources

- [Claus Wilke: Histograms Density Plots](https://clauswilke.com/dataviz/histograms-density-plots.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/rect)
