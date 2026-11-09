---
id: dataviz-show-uncertainty
type: pattern
title: Show Uncertainty
summary: Display a clearly defined uncertainty interval beside an estimate so precision is not silently assumed.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Show the uncertainty around an estimate and say exactly what the displayed range means.

```patternverse-widget
{
  "src": "dataviz-show-uncertainty.html",
  "title": "Show Uncertainty explorer",
  "height": 700,
  "fallback": "Both samples estimate 70% positive responses. Seven of ten gives a Wilson 95% interval of about 39.7–89.2%; seventy of one hundred gives 60.4–78.1%. Equal point estimates need not have equal precision."
}
```

## What to notice

Both point estimates are 70% positive responses. Choose **95% intervals**. Seven positives among ten independent cases gives a Wilson interval of approximately 39.7–89.2%; seventy among one hundred gives 60.4–78.1%.

The points do not move. The ranges reveal different precision under the same binomial working model. These are intervals for the underlying positive-response probability, not the spread of individual binary responses. The data table keeps counts and calculated limits together.

## Useful when

Use this when estimates or predictions may otherwise appear exact, particularly when readers compare their precision or make a decision near a threshold. Select an uncertainty representation appropriate to the method and audience.

## Watch out for

Label the interval method, level, and assumptions. Frequentist coverage concerns the procedure across repeated samples; it is not a 95% probability assigned to this fixed parameter after observing these cases. Independence and the sampling model matter. Intervals do not repair bias or missing coverage, and interval overlap alone is not a general test of a difference.

## Related patterns

[[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]] [[dataviz-show-the-distribution|Show the Distribution]]

## Sources

- [Claus Wilke: Visualizing Uncertainty](https://clauswilke.com/dataviz/visualizing-uncertainty.html)
- [NIST: Wilson intervals for a proportion](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/rule)
