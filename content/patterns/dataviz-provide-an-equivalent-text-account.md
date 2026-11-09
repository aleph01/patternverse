---
id: dataviz-provide-an-equivalent-text-account
type: pattern
title: Provide an Equivalent Text Account
summary: Accompany a visual with a usable textual account of its subject, findings, and interpretive limits.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Write a text account that communicates the essential information someone would otherwise need to extract from the graphic.

```patternverse-widget
{
  "src": "dataviz-provide-an-equivalent-text-account.html",
  "title": "Provide an Equivalent Text Account explorer",
  "height": 700,
  "fallback": "Across eight support categories in one fictional week, Billing has the most tickets: 124 of 525 (23.6%). Subscription follows at 97; Feedback has the fewest at 28. Counts describe workload, not severity or time spent."
}
```

## What to notice

Toggle between **With text account** and **Chart only**. The bars never change. The added paragraph identifies the fictional support week, the leading category, its denominator, the next category, and the smallest count.

“Billing has 124 of 525 tickets” communicates more than “a bar chart of support requests.” The account also states a limit: counts describe workload, not severity or time spent. The expandable table supplies every category and exact value in both teaching views.

## Useful when

Use this for charts, maps, and diagrams whose meaning matters to the surrounding content. Provide a short identification and a longer account when the graphic contains substantial information. Make the account available to everyone when it improves understanding.

## Watch out for

A title alone is rarely an equivalent description. Describe meaningful relationships and qualifications without reproducing every decorative detail. A table preserves values but may still leave the main relationship unexplained. Keep the account synchronized with filters and updates, and avoid claiming causes or conclusions that the visual evidence does not support.

## Related patterns

[[dataviz-label-directly|Label Directly]] [[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]]

## Sources

- [W3C: Complex images](https://www.w3.org/WAI/tutorials/images/complex/)
- [Claus Wilke: Figure Titles Captions](https://clauswilke.com/dataviz/figure-titles-captions.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/features/accessibility)
