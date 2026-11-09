---
id: dataviz-preserve-elapsed-time
type: pattern
title: Preserve Elapsed Time
summary: Space time observations by their actual elapsed intervals when readers need to interpret timing and rate.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Let distance along a time axis represent elapsed time when the pace of change is part of the question.

```patternverse-widget
{
  "src": "dataviz-preserve-elapsed-time.html",
  "title": "Preserve Elapsed Time explorer",
  "height": 700,
  "fallback": "Readings are 10, 14, 18, and 20 on days 0, 1, 8, and 9. The middle rise takes seven days; the first takes one. Equal gaps between all observations conceal that difference."
}
```

## What to notice

The readings are 10, 14, 18, and 20 units on days 0, 1, 8, and 9. **Equal spacing** gives every observation the same gap, making the first two four-unit rises look equally fast.

Choose **Elapsed days**. The middle segment now spans seven days, while the first spans one. Its average rate is about 0.57 units per day rather than four. Values and chronological order stay fixed; only the mapping of observation time to horizontal position changes.

## Useful when

Use elapsed spacing for irregular sampling, gaps in reporting, sensor readings, and time-dependent rates. Readers should be able to distinguish a long interval from a short one without inspecting a separate date list.

## Watch out for

A connecting line guides the eye between observations; it does not show measurements taken inside the interval. Preserve visible gaps when continuity is unsupported. If equal spacing represents events or sequence positions intentionally, label that axis accordingly. Dates with time zones or daylight-saving changes also require a clear definition of elapsed time.

## Related patterns

[[dataviz-distinguish-missing-from-zero|Distinguish Missing from Zero]] [[dataviz-align-for-comparison|Align for Comparison]]

## Sources

- [Claus Wilke: Time Series](https://clauswilke.com/dataviz/time-series.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
