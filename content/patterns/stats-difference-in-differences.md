---
id: stats-difference-in-differences
type: pattern
title: 'Compare Changes Against an Untreated Group'
summary: 'Estimate a treatment contrast by comparing changes when a credible counterfactual trend is available.'
status: published
verses:
  - statistics
---

A store's sales rise after a renovation. The manager attributes the increase to the renovation, but sales also rose at nearby unrenovated stores during the same holiday season. A before-after comparison mixes the intervention with other changes over time.

Difference-in-differences compares the treated group's change with a comparison group's change. Its causal interpretation requires a credible argument that, without treatment, the relevant trends would have evolved in parallel, along with the other assumptions of the design.

## Interactive example

![Treated change 15 index points minus untreated change 8 gives a difference of 7.](../assets/statistics/stats-did-preview.svg 'A treated index changing from 40 to 55 and an untreated index changing from 20 to 28 gives (55-40)-(28-20)=7. The arithmetic alone does not establish causality.')

The first two bars show changes, not the stores’ sales levels. The third subtracts the untreated change from the treated change. Run the example to change the before and after values; Reset restores the seven-point result.

```patternverse-widget
{
  "src": "stats-did.html",
  "title": "Difference-in-differences explorer",
  "height": 900,
  "fallback": "A treated index changing from 40 to 55 and an untreated index changing from 20 to 28 gives (55-40)-(28-20)=7. The arithmetic alone does not establish causality."
}
```

## Calculate the contrast

Suppose the treated store's weekly sales index rises from 40 to 55, while an untreated store rises from 20 to 28. The treated change is 15; the untreated change is 8. The difference-in-differences is 15 - 8 = 7 index points.

Another way to read the calculation is to build the missing “without renovation” outcome. If the treated store would have gained the comparison store’s eight points anyway, its expected index without renovation is **40 + 8 = 48**. Its observed index is 55, leaving **55 − 48 = 7**. This imagined untreated outcome is the counterfactual.

The stores need not start at the same level. The parallel-trends assumption concerns their changes without renovation, not their starting values. We do not observe the treated store without renovation in the later period, so the arithmetic cannot verify that assumption.

The interactive example lets you change the four values. It displays both changes and their difference. Use it to distinguish an impressive raw improvement from an improvement beyond a plausible background trend. The example supplies no sampling uncertainty and does not test the causal assumptions.

## Investigate the counterfactual trend

Inspect earlier outcomes, the timing of treatment, and other events affecting either group. Similar pretreatment trends can support plausibility but cannot prove how the treated group would have evolved after treatment without treatment. A group-specific shock at the same time can invalidate the comparison despite an excellent earlier match.

Consider spillovers. A renovated store might take customers from the comparison store. Then the comparison group's change is itself affected by treatment, undermining the proposed counterfactual. Anticipation can also move behavior before the recorded intervention date.

A second application is a policy introduced in one region. Use substantive knowledge to explain why another region offers a useful comparison, including economic changes, measurement consistency, and other simultaneous policies.

## Advanced notes: design details change the estimator

With many groups adopting treatment at different times and effects varying across groups or time, a conventional two-way fixed-effects regression can combine comparisons in undesirable ways. Choose an estimator and target appropriate to the adoption structure rather than assuming the simplest two-by-two formula scales unchanged.

Uncertainty must reflect dependence and assignment at the relevant level. Thousands of customers in two stores do not create thousands of independent policy assignments. The number and structure of comparison units matter.

The parallel-trends claim also depends on the outcome scale. Parallel changes in levels and parallel proportional changes are different assumptions. Choose the scale for substantive reasons and examine sensitivity to reasonable alternatives.

Use this pattern when treatment begins at a known time and untreated observations can inform a credible trajectory. Present the comparison as a design with assumptions, timing, and diagnostics, rather than as a regression command that automatically converts history into causality.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [The Effect](https://www.theeffectbook.net/ch-DifferenceinDifference.html)
