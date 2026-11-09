---
id: dataviz-show-intersections-explicitly
type: pattern
title: Show Intersections Explicitly
summary: Show exact category combinations when people or items can belong to several sets.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Show exact category combinations when people or items can belong to several sets.

```patternverse-widget
{
  "src": "dataviz-show-intersections-explicitly.html",
  "title": "Show Intersections Explicitly explorer",
  "height": 800,
  "fallback": "Exact memberships are A only 4, B only 3, C only 2, AB only 5, AC only 1, BC only 2, ABC 3. These mutually exclusive intersections sum to 20 people. Category totals A=13, B=13, C=8 overlap and sum to 34 memberships."
}
```

## What to notice

**Category totals** reports A = 13, B = 13, and C = 8. These totals sum to 34 memberships, although there are only 20 people. They cannot be stacked as exclusive parts of one population.

Switch to **Exact intersections**. Each column represents one mutually exclusive combination. Filled dots identify its included categories; the bar above counts its people. AB contains five people in A and B but not C. ABC contains another three people in all three. The seven bars reconcile to 20.

## Useful when

Use this for overlapping interests, product usage, attributes, or diagnostic tags when combinations matter more than individual set totals. State whether intersections are exact memberships or inclusive overlaps.

## Watch out for

“A and B” can mean either AB alone or every member shared by A and B, including ABC. Label that distinction. Combinations increase rapidly with more sets; filtering or ranking may help, but disclose omitted intersections and people outside all sets. This example contains no outside-all group. Keep counts alongside the membership matrix so dot patterns do not become a puzzle without quantities.

## Related patterns

[[dataviz-show-parts-in-context|Show Parts in Context]] [[dataviz-filter-to-focus|Filter to Focus]]

## Sources

- [Further reading: UpSet: Visualization of Intersecting Sets](https://www.visdesignlab.net/publications/2014_infovis_upset/)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/cell)
