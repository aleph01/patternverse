---
id: dataviz-distinguish-missing-from-zero
type: pattern
title: Distinguish Missing from Zero
summary: Represent an unavailable measurement separately from an observed absence.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Keep missing observations visibly distinct from measured zeros so the chart does not invent evidence.

```patternverse-widget
{
  "src": "dataviz-distinguish-missing-from-zero.html",
  "title": "Distinguish Missing from Zero explorer",
  "height": 700,
  "fallback": "Monday reports 12, Tuesday 0, Wednesday is missing, Thursday 18, and Friday 15. The gap represents unavailable evidence; filling it with zero invents a measurement. Tuesday is a genuine observed zero."
}
```

## What to notice

Tuesday reports zero cases. Wednesday has no reported count. In **Keep missing**, Tuesday has a point at zero, while Wednesday has no point and the connecting line breaks.

Choose **Fill with zero** to inspect the consequence of a common shortcut: Wednesday acquires a false zero and the trajectory gains an unsupported dip. The recorded-data table stays unchanged and still identifies Wednesday as missing. This alternative is a deliberately incorrect treatment, not an additional observed scenario.

## Useful when

Use this when reporting is incomplete, devices fail, categories are suppressed, or a source distinguishes absent values from actual zero activity. Carry the distinction through transformations as well as the final graphic.

## Watch out for

A blank needs an explanation; viewers should not have to guess whether it means unavailable, not applicable, or zero. If you impute values, distinguish them from observations and explain the method. Connecting across a gap may suggest unsupported continuity. Also preserve genuine zero values: dropping them as though they were missing creates a different distortion.

## Related patterns

[[dataviz-preserve-elapsed-time|Preserve Elapsed Time]] [[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]]

## Sources

- [Claus Wilke: Time Series](https://clauswilke.com/dataviz/time-series.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
