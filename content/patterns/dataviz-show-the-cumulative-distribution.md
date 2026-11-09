---
id: dataviz-show-the-cumulative-distribution
type: pattern
title: Show the Cumulative Distribution
summary: Accumulate observations into a share to answer questions about thresholds directly.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Accumulate observations into a share to answer questions about thresholds directly.

```patternverse-widget
{
  "src": "dataviz-show-the-cumulative-distribution.html",
  "title": "Show the Cumulative Distribution explorer",
  "height": 800,
  "fallback": "Waiting times are 2, 3, 4, 4, 5, 5, 6, 7, 8, 10, 12, and 18 minutes. Seven of twelve waits (58.3%) are at most six minutes. The cumulative curve includes ties and reaches 100% at eighteen minutes."
}
```

## What to notice

The **Histogram** groups the twelve waiting times into four-minute bins. It reveals where observations concentrate, but a threshold inside a bin is difficult to read precisely.

Switch to **Cumulative** and move the threshold. At six minutes, seven of twelve waits—58.3%—are at or below the line. The curve steps upward when observations occur, including a larger jump for tied values. It reaches 100% at eighteen minutes. Neither bin width nor a smoothed density estimate determines this cumulative account.

## Useful when

Use this when readers ask how many cases meet a limit, what share exceeds a waiting time, or which value contains a chosen proportion of observations. State whether the threshold includes equality and which population supplies the denominator.

## Watch out for

A cumulative curve can be less familiar than a histogram, so accompany it with a plain-language readout. Its slope is not a count at one exact value. Finite observations do not describe the entire population without uncertainty. Missing or censored waiting times require explicit treatment; silently excluding unfinished waits can make service appear faster.

## Related patterns

[[dataviz-show-the-distribution|Show the Distribution]] [[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/ecdf-qq.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
