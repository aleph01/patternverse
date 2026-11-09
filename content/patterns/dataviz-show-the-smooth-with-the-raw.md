---
id: dataviz-show-the-smooth-with-the-raw
type: pattern
title: Show the Smooth with the Raw
summary: Keep observations visible beside a smooth so readers can inspect what the summary suppresses.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Keep observations visible beside a smooth so readers can inspect what the summary suppresses.

```patternverse-widget
{
  "src": "dataviz-show-the-smooth-with-the-raw.html",
  "title": "Show the Smooth with the Raw explorer",
  "height": 800,
  "fallback": "Daily readings are 12, 18, 11, 21, 14, 25, 3, 26, 20, 30, 23, 33, 27, 36, 31 units. A centered moving average summarizes the trend; the day-seven reading of 3 remains important. Only full windows are calculated."
}
```

## What to notice

**Smooth only** shows a broadly rising trajectory. Increase the window size to average over more neighboring days and reduce short fluctuations.

Switch to **Smooth + raw**. Day seven falls to just 3 units, much farther than the average suggests. The green line and individual readings now answer complementary questions: how the local average changes, and how far observations depart from it. Only complete, centered windows are calculated, so larger windows leave more space at the ends.

## Useful when

Use this for noisy time series, repeated measurements, or relationships where a trend helps orient the reader but individual departures still matter. Explain the smoothing method, window, alignment, and handling of boundaries.

## Watch out for

A smooth is a derived summary, not an extra observation or a forecast. Centered windows use subsequent observations, so they are unsuitable for depicting information available in real time. Larger windows can hide abrupt changes. Here the samples are equally spaced; irregular timestamps need a method that respects elapsed time rather than silently averaging a fixed number of rows.

## Related patterns

[[dataviz-preserve-elapsed-time|Preserve Elapsed Time]] [[dataviz-keep-individual-observations-visible|Keep Individual Observations Visible]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/visualizing-trends.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
