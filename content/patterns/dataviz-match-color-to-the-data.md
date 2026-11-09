---
id: dataviz-match-color-to-the-data
type: pattern
title: Match Color to the Data
summary: Choose categorical, sequential, diverging, or cyclic color scales according to the variable being encoded.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Choose the role of color from the meaning and structure of the variable it represents.

```patternverse-widget
{
  "src": "dataviz-match-color-to-the-data.html",
  "title": "Match Color to the Data explorer",
  "height": 700,
  "fallback": "Categories need distinct identities; ordered values need a progression; deviations need a meaningful midpoint; directions wrap from 315 degrees back toward zero. This control changes the variable being illustrated, not just the palette."
}
```

## What to notice

The control selects four different variable types. **Categories** gives A–D distinct identities without implying rank. **Ordered values** uses a progression for values from 0 to 70.

**Midpoint** places negative and positive departures on opposite sides of zero. **Cycle** wraps directions around a full turn, where 360° meets 0°. Read the value beside each swatch: the example changes the variable being illustrated, rather than presenting four interchangeable palettes for one dataset.

## Useful when

Use this whenever color carries meaning. First ask whether viewers need to distinguish identities, follow increasing magnitude, compare departures from a meaningful center, or read a repeating cycle. Keep the mapping consistent across related views.

## Watch out for

A diverging midpoint needs a defensible meaning; the average of an arbitrary range is not automatically suitable. Limit categorical identities to a distinguishable set, and check contrast at the final size. Color alone may fail in grayscale or for some viewers, so supply labels or another usable cue. A palette cannot repair an unsuitable measure.

## Related patterns

[[dataviz-redundant-coding|Redundant Coding]] [[dataviz-highlight-the-relevant-contrast|Highlight the Relevant Contrast]]

## Sources

- [Claus Wilke: Color Basics](https://clauswilke.com/dataviz/color-basics.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/scales)
