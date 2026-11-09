---
id: dataviz-redundant-coding
type: pattern
title: Redundant Coding
summary: Give essential distinctions more than one visible carrier so they remain usable without color identification.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Pair color with shape, labels, or another cue when the distinction must survive loss of hue information.

```patternverse-widget
{
  "src": "dataviz-redundant-coding.html",
  "title": "Redundant Coding explorer",
  "height": 700,
  "fallback": "North, East, and West keep the same positions. Circles, squares, and triangles provide an additional identification channel that remains available in grayscale. Grayscale is a reproduction test, not a simulation of every color-vision difference."
}
```

## What to notice

Start with **Color only**, then select **View in grayscale**. North, East, and West all use circles, leaving their identities dependent on color or differences in reproduced tone.

Choose **Color + shape**. Circles identify North, squares East, and triangles West; the same shapes appear in the key. They remain available in grayscale while the observations and positions stay fixed. You can return to color to see how two compatible channels reinforce the same category distinction.

## Useful when

Use redundant cues for important categories, statuses, selected items, or comparisons that may be viewed in grayscale or by people who cannot distinguish the chosen colors. Choose an additional channel appropriate to the marks.

## Watch out for

Grayscale is a useful reproduction check, not a simulation of every color-vision difference. Shapes need sufficient size and separation, and the key must preserve the same mapping. Too many symbol types become another decoding problem. Redundancy should reinforce the intended meaning rather than assign unrelated variables to cues that readers naturally interpret together.

## Related patterns

[[dataviz-match-color-to-the-data|Match Color to the Data]] [[dataviz-label-directly|Label Directly]]

## Sources

- [Claus Wilke: Redundant Coding](https://clauswilke.com/dataviz/redundant-coding.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/dot)
