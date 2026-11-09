---
id: dataviz-preserve-meaningful-geography
type: pattern
title: Preserve Meaningful Geography
summary: Keep real spatial relationships visible when adjacency and location are part of the question.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Keep real spatial relationships visible when adjacency and location are part of the question.

```patternverse-widget
{
  "src": "dataviz-preserve-meaningful-geography.html",
  "title": "Preserve Meaningful Geography explorer",
  "height": 800,
  "fallback": "The west-coast districts Bay, Cove, and Delta have rates 80, 70, and 60 per 1,000; inland Elm, Fern, and Grove have 20, 30, and 25. Ranking reveals the largest rate; geographic positions reveal the coastal cluster. All values and boundaries are fictional."
}
```

## What to notice

**Ranked values** makes Bay’s rate of 80 per 1,000 easy to identify, followed by Cove at 70 and Delta at 60. It answers which district is highest.

Switch to **Geographic context**. Those three districts occupy the west coast of the fictional island. Inland districts have lower values. The spatial view reveals their adjacency, while the ranked view supports more precise comparison. Both use the same rates and a fixed light-to-dark scale. The schematic uses equal-sized districts and explicitly fictional boundaries.

## Useful when

Use a map when readers need to understand location, neighboring areas, routes, or spatial concentrations. Pair it with an aligned comparison when ranking matters too. Choose a projection and geographic detail appropriate to the question.

## Watch out for

A region’s area is not its population, and large shapes can dominate attention. Use appropriate denominators for shaded rates; counts may suit proportional symbols instead. Administrative boundaries can conceal local variation. Adjacency alone does not identify a shared cause, and a synthetic teaching map cannot support conclusions about any real place. Always state the location and spatial unit represented.

## Related patterns

[[dataviz-normalize-by-exposure|Normalize by Exposure]] [[dataviz-sort-to-reveal-order|Sort to Reveal Order]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/geospatial-data.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/geo)
