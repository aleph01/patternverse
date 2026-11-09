---
id: dataviz-align-for-comparison
type: pattern
title: Align for Comparison
summary: Use shared scales and aligned positions when readers need to compare magnitudes across views.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Give comparable measurements the same visual scale so equal lengths and positions mean equal quantities.

```patternverse-widget
{
  "src": "dataviz-align-for-comparison.html",
  "title": "Align for Comparison explorer",
  "height": 700,
  "fallback": "North records 18, 24, and 30 units; South records 60, 80, and 100. Independent axes stretch both teams to the same apparent width. A shared zero-to-110 scale preserves their magnitude differences."
}
```

## What to notice

Switch from **Independent** to **Shared**. North's longest bar represents 30 units; South's represents 100. Independent axes stretch both to fill their panels, making the teams look similarly productive. Shared axes reveal their different magnitudes.

Task labels, counts, and colors stay fixed. The second view changes the relationship between values and space. North remains internally ordered in both views, but only the shared scale supports a direct comparison of bar lengths between teams.

## Useful when

Use shared scales when comparing groups, periods, locations, or alternative scenarios with the same measure and units. Align corresponding categories too, so readers can compare without reconstructing their positions.

## Watch out for

Independent scales can reveal the shape of a small series that would otherwise look flat. Label that choice clearly and avoid presenting lengths as directly comparable. Shared axes also cannot make incompatible units or differently defined populations comparable.

## Related patterns

[[dataviz-small-multiples|Small Multiples]] [[dataviz-sort-to-reveal-order|Sort to Reveal Order]]

## Sources

- [Claus Wilke: Multi Panel Figures](https://clauswilke.com/dataviz/multi-panel-figures.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/bar)
