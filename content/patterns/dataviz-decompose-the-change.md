---
id: dataviz-decompose-the-change
type: pattern
title: Decompose the Change
summary: Connect a starting total to an ending total through contributions that reconcile.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Connect a starting total to an ending total through contributions that reconcile.

```patternverse-widget
{
  "src": "dataviz-decompose-the-change.html",
  "title": "Decompose the Change explorer",
  "height": 800,
  "fallback": "Workload starts at 100, adds 40 new cases, removes 25 resolved cases, and adds 15 reopened cases, ending at 130. Contributions reconcile exactly: 100 + 40 − 25 + 15 = 130. This arithmetic does not establish causes."
}
```

## What to notice

**Start and end** shows workload rising from 100 to 130 cases. The net increase is 30, but that comparison conceals larger movements in both directions.

Choose **Show contributions**. Forty new cases take the running total to 140. Resolving 25 reduces it to 115; reopening 15 takes it to 130. Each contribution begins where the preceding one ends. Opening and closing totals start from zero, while the floating bars represent signed changes. Their positions make the reconciliation inspectable.

## Useful when

Use this for inventories, budgets, workload, or other additive balances when readers need to understand the components behind a net change. Include both increases and decreases, with compatible units and a clear period.

## Watch out for

The accounting must close: omitted or overlapping contributions break the explanation. This example treats new, resolved, and reopened events as separate signed movements; the same case may appear in different movements over time. The display explains arithmetic, not causation. Order can suggest a sequence, so distinguish a real chronology from a convenient arrangement of additive components.

## Related patterns

[[dataviz-show-paired-differences|Show Paired Differences]] [[dataviz-compare-against-a-reference|Compare Against a Reference]]

## Sources

- [Further reading: Observable Plot normalization](https://observablehq.github.io/plot/marks/rect)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/rect)
