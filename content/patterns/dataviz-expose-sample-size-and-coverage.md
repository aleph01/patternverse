---
id: dataviz-expose-sample-size-and-coverage
type: pattern
title: Expose Sample Size and Coverage
summary: Keep respondent counts and population coverage visible beside percentages and other summaries.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Show how much evidence supports each summary and how much of the intended population it covers.

```patternverse-widget
{
  "src": "dataviz-expose-sample-size-and-coverage.html",
  "title": "Expose Sample Size and Coverage explorer",
  "height": 700,
  "fallback": "Both groups report 75% positive. A has 3 positives among 4 respondents, with 4 of 10 invitees responding. B has 75 among 100, with all 100 invitees responding. Sample size and response coverage describe different limitations."
}
```

## What to notice

Both surveys show 75% positive responses. Choose **Show denominators**. A's rate comes from 3 positives among 4 respondents; B's comes from 75 among 100.

Their response coverage differs too. Four of ten invited people responded in A, compared with all one hundred invitees in B. The percentages remain fixed, but the supporting evidence becomes interpretable. A small respondent count raises precision questions; missing invitees raise questions about whether respondents represent everyone invited. These are different limitations.

## Useful when

Use this when comparing rates, averages, groups of unequal size, response summaries, or results with incomplete follow-up. Name what the denominator includes and which population the result is intended to describe.

## Watch out for

A large sample does not guarantee representative coverage, and complete response among invitees does not make the invitation process representative. Counts alone do not quantify uncertainty. Keep unknown or excluded cases explicit rather than silently removing them from the denominator. Avoid presenting a minimum sample-size rule as a guarantee of a trustworthy estimate.

## Related patterns

[[dataviz-show-uncertainty|Show Uncertainty]] [[dataviz-show-parts-in-context|Show Parts in Context]]

## Sources

- [Claus Wilke: Boxplots Violins](https://clauswilke.com/dataviz/boxplots-violins.html)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/dot)
