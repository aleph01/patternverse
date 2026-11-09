---
id: dataviz-expose-parent-child-structure
type: pattern
title: Expose Parent–Child Structure
summary: Preserve parent links when membership within a hierarchy carries meaning.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Preserve parent links when membership within a hierarchy carries meaning.

```patternverse-widget
{
  "src": "dataviz-expose-parent-child-structure.html",
  "title": "Expose Parent–Child Structure explorer",
  "height": 800,
  "fallback": "The catalogue contains Research (Field, Desk) and Delivery (Build, Support). A tree preserves the parent of each item. Expanding the hierarchy adds the four leaves while retaining the two branches and root. Edge lengths do not encode quantity."
}
```

## What to notice

**Top level** shows the catalogue’s two branches: Research and Delivery. Their shared root remains visible.

Choose **All levels**. Research expands into Field and Desk; Delivery expands into Build and Support. The tree makes each leaf’s parent explicit and keeps the root in place. A reader can follow Support back through Delivery to Catalogue. The layout positions nodes for readability: neither line length nor a node’s horizontal or vertical spacing represents a quantity.

## Useful when

Use this for catalogues, organizational structures, file systems, taxonomies, or nested classifications with a clear parent relation. Start at a useful depth and allow expansion when showing everything would overwhelm the reader. Preserve a visible path back to broader context.

## Watch out for

A tree assumes one parent per node. Shared ownership, cross-listings, and cycles require additional links or a different representation. Do not imply that equally spaced siblings have equal size or importance. Very deep hierarchies can become difficult to navigate, especially on narrow screens. Collapsing a branch should conceal its children explicitly, rather than making an incomplete structure look complete.

## Related patterns

[[dataviz-show-parts-in-context|Show Parts in Context]] [[dataviz-overview-plus-detail|Overview Plus Detail]]

## Sources

- [Further reading: A Tour through the Visualization Zoo](https://idl.uw.edu/papers/visualization-zoo)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/tree)
