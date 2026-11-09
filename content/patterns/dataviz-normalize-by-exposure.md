---
id: dataviz-normalize-by-exposure
type: pattern
title: Normalize by Exposure
summary: Divide by a relevant exposure when groups have different opportunities for events to occur.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Divide by a relevant exposure when groups have different opportunities for events to occur.

```patternverse-widget
{
  "src": "dataviz-normalize-by-exposure.html",
  "title": "Normalize by Exposure explorer",
  "height": 800,
  "fallback": "North has 240 incidents among 120,000 people (200 per 100,000); Central has 180 among 45,000 (400); South has 90 among 90,000 (100). North has the most incidents; Central has the highest population rate."
}
```

## What to notice

In **Counts**, North has the most incidents: 240. Central records 180 and South 90. This answers where the total incident workload is largest.

Switch to **Per 100,000 people**. Central now leads at 400, followed by North at 200 and South at 100. The denominator changes the question to incidents relative to population. No district gains or loses an incident; the recorded counts and populations stay available in the table.

## Useful when

Use rates to compare places of different population sizes, failures across unequal operating hours, or purchases across different numbers of visits. Choose the denominator that represents the opportunity relevant to the question, and state its units and reporting period.

## Watch out for

A rate is only as meaningful as its denominator. Resident population may poorly represent exposure in a commuter district. Small denominators can produce unstable rates, and differences in age or other composition can remain. Keep counts nearby when readers also need workload; normalization alone does not establish comparability.

## Related patterns

[[dataviz-expose-sample-size-and-coverage|Expose Sample Size and Coverage]] [[dataviz-show-parts-in-context|Show Parts in Context]]

## Sources

- [Further reading: Fundamentals of Data Visualization](https://clauswilke.com/dataviz/geospatial-data.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/bar)
