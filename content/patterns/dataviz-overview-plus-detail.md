---
id: dataviz-overview-plus-detail
type: pattern
title: Overview Plus Detail
summary: Pair a focused view with a broader overview so detail retains its location in the whole.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Pair a focused view with a broader overview so detail retains its location in the whole.

```patternverse-widget
{
  "src": "dataviz-overview-plus-detail.html",
  "title": "Overview Plus Detail explorer",
  "height": 800,
  "fallback": "The detail always contains six consecutive months. A full 24-month overview locates that interval within the longer series and retains a later spike outside many selected windows. Both panels keep the same value scale."
}
```

## What to notice

**Detail only** shows six consecutive months at a readable scale. Move **First month in detail** to inspect another interval. Without context, the selected segment could look like the entire record.

Switch to **Overview + detail**. The shaded overview region locates the same six months within all 24. A spike at month nineteen becomes visible even when it falls outside the detail window. Both panels retain a zero-to-seventy value scale; the horizontal scope changes, while magnitude remains directly comparable.

## Useful when

Use this for long timelines, large documents, spatial views, or dense records where readers need both local inspection and orientation. Keep the selected region clearly indicated and update the overview and detail from the same selection state.

## Watch out for

Detail can overemphasize a convenient interval. State the full extent and selected extent, and make it easy to move elsewhere. Independent vertical scales may help local inspection but must be explicit. This example uses a slider rather than a draggable overview; either control should describe the same interval. Missing values and aggregation differences still need disclosure in both views.

## Related patterns

[[dataviz-preserve-elapsed-time|Preserve Elapsed Time]] [[dataviz-filter-to-focus|Filter to Focus]]

## Sources

- [Further reading: Interactive Dynamics for Visual Analysis](https://idl.uw.edu/papers/interactive-dynamics)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/interactions)
