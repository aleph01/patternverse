---
id: dataviz-sort-to-reveal-order
type: pattern
title: Sort to Reveal Order
summary: Arrange categories by value when readers need to compare ranks, leaders, and gaps.
status: published
verses: [data-visualization]
tags: [data-visualization, comparison, ranking, ordering]
---

Arrange categories by value when the question is **which is larger**, rather than **where is this name?**

```patternverse-widget
{
  "src": "dataviz-sort-order.html",
  "title": "Same tickets, different order",
  "height": 600,
  "fallback": "In a fictional week of 525 support tickets, Billing leads with 124, followed by Subscription with 97 and Delivery with 83. Switching from alphabetical to highest-first order preserves every count, the zero baseline, and the color. Only row order changes."
}
```

## What to notice

Switch between **Alphabetical** and **Highest first**. In the alphabetical view, you search across the chart to compare the largest categories. Sorting puts Billing, Subscription, and Delivery together at the top; the smaller categories follow in order.

All eight counts, bar lengths, colors, and the horizontal scale stay fixed. The new arrangement reveals a ranking already present in the data. It adds no evidence about why a category receives more tickets.

## Useful when

Use this for unordered categories when readers need to find leaders, compare nearby ranks, or inspect a long tail. Alphabetical order remains useful when finding a known name is the main task.

## Watch out for

Preserve meaningful sequences: months, process stages, and ordered response scales usually need their natural order. Re-sorting every panel independently can also make a category difficult to track across views. For tied values, use a consistent secondary order rather than implying a difference.

## Related patterns

[[dataviz-align-for-comparison|Align for Comparison]] keeps magnitudes comparable across views. [[dataviz-highlight-the-relevant-contrast|Highlight the Relevant Contrast]] directs attention without hiding the surrounding observations.

## Sources

- [Claus Wilke: Visualizing Amounts](https://clauswilke.com/dataviz/visualizing-amounts.html)
- [Observable Plot: Bar Marks](https://observablehq.github.io/plot/marks/bar)
