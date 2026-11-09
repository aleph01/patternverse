---
id: dataviz-compare-state-transitions
type: pattern
title: Compare State Transitions
summary: Track matched identities between states so movement is not mistaken for a change in totals alone.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Track matched identities between states so movement is not mistaken for a change in totals alone.

```patternverse-widget
{
  "src": "dataviz-compare-state-transitions.html",
  "title": "Compare State Transitions explorer",
  "height": 800,
  "fallback": "Of four members starting New, three become Active and one Paused. Of five starting Active, four remain Active and one becomes Paused. Of three starting Paused, two become Active and one remains Paused. End totals are nine Active and three Paused."
}
```

## What to notice

The matrix places first status in rows and second status in columns. **All members** includes twelve matched people: nine end Active and three end Paused.

Select **Started New**. Of those four people, three become Active and one becomes Paused. **Started Active** reveals four staying Active and one moving to Paused. **Started Paused** reveals two becoming Active and one staying Paused. Other rows remain visible but subdued. The same fixed color scale represents counts throughout, and zero cells stay explicit.

## Useful when

Use this for movement between customer stages, employment states, classifications, or process statuses when the same entities are observed at two points. Keep the state definitions and observation times clear; preserve a category for genuinely unknown status if needed.

## Watch out for

Endpoint transitions omit intermediate changes: someone may leave and return between observations. Distinguish staying in a state from entering it, and reconcile both row and column totals. New entrants or departures need explicit treatment. A large diagonal may reflect a large starting population rather than unusually stable behavior; counts and row-based transition percentages answer different questions.

## Related patterns

[[dataviz-show-paired-differences|Show Paired Differences]] [[dataviz-show-parts-in-context|Show Parts in Context]]

## Sources

- [Further reading: A Tour through the Visualization Zoo](https://idl.uw.edu/papers/visualization-zoo)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/cell)
