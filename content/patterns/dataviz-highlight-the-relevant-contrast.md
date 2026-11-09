---
id: dataviz-highlight-the-relevant-contrast
type: pattern
title: Highlight the Relevant Contrast
summary: Emphasize the comparison that matters while preserving the evidence around it.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Give the relevant contrast visual emphasis while keeping the surrounding observations available for scrutiny.

```patternverse-widget
{
  "src": "dataviz-highlight-the-relevant-contrast.html",
  "title": "Highlight the Relevant Contrast explorer",
  "height": 700,
  "fallback": "Billing has 124 of 525 tickets. Highlighting it changes attention, not the counts, row order, or axis. All seven other categories remain available for comparison."
}
```

## What to notice

Choose **Highlight Billing**. One bar becomes green among the gray support categories. Billing's count remains 124; every bar keeps its value, length, position, and label.

The emphasis proposes a starting point for attention. It does not create a larger difference or establish why Billing receives more tickets. Because the other seven categories remain visible, readers can inspect the claim against its context instead of relying on the highlighted observation alone.

## Useful when

Use this in explanations with a defined comparison, a selected case, or an exception that needs attention. Make the accompanying text identify why this particular item deserves emphasis for the current question.

## Watch out for

Highlighting can steer readers toward a flattering or alarming result. Preserve relevant context and avoid treating the chosen observation as automatically important. If many marks are highlighted, the distinction loses usefulness. Exploratory views may instead need neutral styling or reader-controlled selection. Ensure emphasized and background marks remain legible, with labels supplying meaning beyond color.

## Related patterns

[[dataviz-label-directly|Label Directly]] [[dataviz-match-color-to-the-data|Match Color to the Data]]

## Sources

- [Claus Wilke: Color Pitfalls](https://clauswilke.com/dataviz/color-pitfalls.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/bar)
