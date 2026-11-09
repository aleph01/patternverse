---
id: dataviz-resolve-overplotting
type: pattern
title: Resolve Overplotting
summary: Reveal multiplicity when several observations occupy the same visual position.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Reveal multiplicity when several observations occupy the same visual position.

```patternverse-widget
{
  "src": "dataviz-resolve-overplotting.html",
  "title": "Resolve Overplotting explorer",
  "height": 800,
  "fallback": "Eighty observations occupy only five recorded coordinate pairs, with counts 18, 12, 25, 15, and 10. Transparency, deterministic offsets, and hexagonal counts reveal multiplicity in different ways. Offsets are display positions, not additional measurements."
}
```

## What to notice

**Plain points** shows only five locations, although the table contains 80 observations. The middle location contains 25 cases, while another contains ten; opaque dots hide this difference.

Try **Transparency**, **Jitter**, and **Hexagonal bins**. Transparency darkens repeated positions. Jitter separates cases using small, fixed display offsets. Bins replace individual points with local counts; darker hexagons contain more observations. Each representation exposes overlap differently while preserving the same recorded coordinates.

## Useful when

Use this when rounded measurements, dense scatterplots, or repeated responses conceal how many cases are present. Choose a representation according to whether readers need individual identity, approximate concentration, or explicit aggregate counts.

## Watch out for

Jitter moves displayed positions and must remain small and clearly explained. Transparency can saturate, making different large counts look alike. Binning depends on bin size and replaces exact locations with regions; these screen-space hexagons can regroup on resize. Keep the table and text account available, and avoid treating an offset as a more precise measurement.

## Related patterns

[[dataviz-keep-individual-observations-visible|Keep Individual Observations Visible]] [[dataviz-show-the-distribution|Show the Distribution]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/overlapping-points.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/dot)
