---
id: dataviz-filter-to-focus
type: pattern
title: Filter to Focus
summary: Narrow the visible records to a relevant subset while making the selection and remaining evidence explicit.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Narrow the visible records to a relevant subset while making the selection and remaining evidence explicit.

```patternverse-widget
{
  "src": "dataviz-filter-to-focus.html",
  "title": "Filter to Focus explorer",
  "height": 800,
  "fallback": "Twelve requests have recorded hours and task counts. Region filters show a subset on fixed axes; they do not change the underlying records. The displayed count always states how many of twelve observations remain. An additional hours threshold can produce an empty result."
}
```

## What to notice

**All regions** displays twelve requests on fixed axes. Choose **East** or **West** to inspect six records from one region.

Increase **Minimum hours** to narrow that subset further. The readout reports both the active filters and how many of twelve requests remain. At eleven hours no requests match; the chart says so instead of leaving an unexplained empty frame. Changing filters never alters the source table, and the axes retain their domains across selections.

## Useful when

Use this when readers have a meaningful question about one group, range, or category within a larger dataset. Keep active criteria visible, give a clear route back to all records, and show the denominator when the remaining sample size affects interpretation.

## Watch out for

A selected subset can look persuasive even when it contains very little evidence. Do not silently rescale its axes or hide the selection criteria. An empty result is different from unavailable data or observed zero activity. Multiple filters usually combine conditions; state that rule. Filtering removes context from the chart, so consider linked highlighting when readers need the rest of the population to stay visible.

## Related patterns

[[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]] [[dataviz-brushing-and-linking|Brushing and Linking]]

## Sources

- [Further reading: Interactive Dynamics for Visual Analysis](https://idl.uw.edu/papers/interactive-dynamics)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/interactions)
