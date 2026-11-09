---
id: dataviz-index-to-a-common-start
type: pattern
title: Index to a Common Start
summary: Give each series the same starting index to compare proportional growth from different initial levels.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Give each series the same starting index to compare proportional growth from different initial levels.

```patternverse-widget
{
  "src": "dataviz-index-to-a-common-start.html",
  "title": "Index to a Common Start explorer",
  "height": 800,
  "fallback": "Atlas grows from 1,000 to 1,400 users (+40%); Birch grows from 100 to 200 (+100%). An index of 100 at the first quarter reveals relative growth while concealing absolute scale."
}
```

## What to notice

In **Original values**, Atlas rises from 1,000 to 1,400 users. Birch rises from 100 to 200. Atlas adds more users and remains much larger throughout.

Switch to **Start = 100**. Each value is divided by that service’s first observation and multiplied by 100. Atlas ends at 140, while Birch ends at 200. The smaller service has doubled; the larger has grown by 40%. Equal starting positions make their proportional trajectories easier to compare.

## Useful when

Use an index when comparing growth across services, prices, output, or other positive measures that start at different magnitudes. State the baseline period explicitly, and retain the original values for readers who need absolute scale.

## Watch out for

An index conceals the starting amounts. Baseline choice can strongly affect the impression, especially if the first period is unusual. A zero baseline cannot be used as a divisor; negative baselines complicate interpretation. Equal indexed growth does not imply equal additional users, resources, or contribution to the total.

## Related patterns

[[dataviz-normalize-by-exposure|Normalize by Exposure]] [[dataviz-preserve-elapsed-time|Preserve Elapsed Time]]

## Sources

- [Further reading: Observable Plot normalization](https://observablehq.github.io/plot/transforms/normalize)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
