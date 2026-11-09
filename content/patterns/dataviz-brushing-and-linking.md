---
id: dataviz-brushing-and-linking
type: pattern
title: Brushing and Linking
summary: Carry a selection across multiple views by matching observation identities.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Carry a selection across multiple views by matching observation identities.

```patternverse-widget
{
  "src": "dataviz-brushing-and-linking.html",
  "title": "Brushing and Linking explorer",
  "height": 800,
  "fallback": "A horizontal hours interval selects the same request identities in both views. Unselected observations remain visible in gray. Drag across the scatterplot, or use the two hour controls. Selection changes emphasis; it does not filter out observations."
}
```

## What to notice

**All observations** shows twelve requests by hours and completed tasks, alongside their task distribution.

Choose **Highlight selection**, drag horizontally across the scatterplot, or adjust the two hour controls. Cases inside the inclusive interval turn green in both views. The distribution shows their counts within each task bin, while gray retains the other requests as context. The readout lists the selected identities. This is one selection projected into two representations, rather than two unrelated filters.

## Useful when

Use this when readers need to explore how a group visible in one chart is distributed along another variable. Maintain stable identifiers across views, show selection criteria and counts, and provide keyboard controls alongside dragging.

## Watch out for

Selection changes emphasis here; it does not remove records. Distinguish selected counts from the background total and keep axes stable. A visual cluster may not be a meaningful population, and exploratory selections do not establish a relationship’s significance. Large datasets may need aggregation, but the linked selection must still refer to the same underlying cases. State whether successive gestures replace, add to, or subtract from the current selection; this example replaces it.

## Related patterns

[[dataviz-filter-to-focus|Filter to Focus]] [[dataviz-plot-variables-together|Plot Variables Together]]

## Sources

- [Further reading: Interactive Dynamics for Visual Analysis](https://idl.uw.edu/papers/interactive-dynamics)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/interactions)
