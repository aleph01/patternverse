---
id: dataviz-label-directly
type: pattern
title: Label Directly
summary: Place identifying text beside the marks it describes to reduce repeated legend lookup.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Put identifying text close to its graphical referent when a separate key makes readers repeatedly search back and forth.

```patternverse-widget
{
  "src": "dataviz-label-directly.html",
  "title": "Label Directly explorer",
  "height": 700,
  "fallback": "North ends at 25, West at 24, and East at 10 units. Direct labels identify the lines near their endpoints; separate label positions avoid collisions between the neighboring North and West values."
}
```

## What to notice

In **Legend**, the reader matches three regional names to line colors. Switch to **Direct labels** to identify the same trajectories near their April endpoints.

North ends at 25 units and West at 24, so their labels would collide if placed at the exact endpoint heights. Short connectors move the text apart while leaving both measurements untouched. East ends separately at 10. The line geometry, colors, axes, and observations remain fixed; only the identification method changes.

## Useful when

Use direct labels for a manageable number of series, important observations, thresholds, or selected outliers. Place text where its association is unambiguous and preserve enough space for the words at the actual display size.

## Watch out for

Label placement is part of the design, especially on a phone. Crowded text can be harder to decode than a compact key. When labels move away from a mark, use a clear connector. Do not silently move data points to accommodate words, and retain an equivalent account for viewers who cannot follow the visual association.

## Related patterns

[[dataviz-small-multiples|Small Multiples]] [[dataviz-redundant-coding|Redundant Coding]]

## Sources

- [Claus Wilke: Redundant Coding](https://clauswilke.com/dataviz/redundant-coding.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/text)
