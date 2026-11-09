---
id: stats-regression-discontinuity
type: pattern
title: 'Compare Just Across the Threshold'
summary: 'Use a credible discontinuity in treatment assignment to investigate a local causal effect.'
status: published
verses:
  - statistics
---

A scholarship is awarded to applicants scoring at least 80. Recipients have better later outcomes than nonrecipients, but they also had higher application scores. Comparing all recipients with all nonrecipients confounds the scholarship with the factors reflected in those scores.

A regression-discontinuity design looks for an abrupt outcome change where an assignment rule switches treatment. The running variable is the score used by the rule; the cutoff is the score where eligibility changes. “Local” means the comparison concerns applicants near that cutoff. Applicants just above and below the cutoff may be comparable in the relevant counterfactual outcomes while facing a different treatment rule. Under the design's assumptions, the discontinuity can identify a local causal effect.

## Use the assignment rule as the design

Plot outcomes and treatment receipt against the running variable, which is the score used by the rule. Estimate the outcome relationship near the cutoff on each side and examine the discontinuity at the threshold. Use appropriate local methods and uncertainty procedures rather than an arbitrary high-degree global polynomial.

The key argument is continuity of relevant potential outcomes at the cutoff in the absence of the treatment change. A jump in the observed outcome is then attributed to the treatment rule only if other features do not also jump in a way that explains it.

For example, a program that grants both a scholarship and a mentoring package at the same score identifies the effect of that package of changes, not automatically the isolated effect of money. Clarify the intervention being evaluated.

## Examine manipulation and nearby rules

If applicants or administrators can precisely sort cases around the cutoff, the groups may differ discontinuously for other reasons. Inspect the assignment process, score distribution, covariate behavior, and evidence of other threshold-based changes. These diagnostics inform credibility but do not prove the causal assumptions.

A second example is a customer discount triggered by days since the last purchase. If customers cannot precisely manipulate the recorded timing and no other policy changes at the same point, a local comparison might be useful. If customers deliberately delay purchases to qualify, the assignment process requires closer scrutiny.

## Worked example: compare the two limits at score eighty

Use eight fictional observations to isolate the arithmetic. A scholarship starts at score **80**. The outcome is a later performance score. Values are deliberately noiseless: below the threshold they follow **y = 60 + 2 × (score − 80)**; at or above it they follow **y = 66 + 2 × (score − 80)**. The constructed jump is six points.

| Application score | Later performance |
| --- | --- |
| 76, 77, 78, 79 | 52, 54, 56, 58 |
| 80, 81, 82, 83 | 66, 68, 70, 72 |

Comparing the nearest displayed observations gives **66 − 58 = 8 points**. That includes the two-point change associated with moving from score 79 to score 80 as well as the six-point jump. Comparing all four above with all four below gives **69 − 55 = 14 points**, combining even more of the score gradient with the discontinuity.

A separate local straight line on each side compares the predicted outcomes **at the same cutoff**. Evaluating the lower-score line at 80 gives 60; evaluating the upper-score line gives 66. The fitted discontinuity is therefore **66 − 60 = 6 points**.

A limit here is the value the fitted line approaches at the cutoff. In the picture, compare the two lines at the same horizontal position, score 80. Comparing dots at different scores also includes the ordinary score gradient, which is why the nearest observed gap is eight instead of six. The lower value is a limit approached from below, not the observed outcome of a treated applicant at exactly 80.

![A scholarship cutoff at score eighty separates two constructed straight lines. Their values at the cutoff are sixty and sixty-six, giving a six-point jump. A shaded window from seventy-seven to eighty-three identifies a teaching bandwidth of three score points.](../assets/statistics/threshold-comparison.svg "Noiseless fictional observations illustrate the point-estimate calculation. Shading marks the chosen display window; it is not a confidence band. The cutoff limits rely on the specified lines between observed scores. No confidence interval or claim of adequate sample size follows from this example.")

The figure shades **77 through 83**, a window extending three score points on either side of the cutoff. Using a uniform-weight local linear fit within this illustrative window still recovers the two lines and the six-point jump. The excluded score-76 observation remains visible in gray. The bandwidth was chosen to explain the calculation; it was not optimized from data or selected to support an empirical conclusion.

The displayed scores are integers. Recovering the lower limit of 60 at score 80 relies on the specified straight-line relationship across the unobserved gap from 79 to 80. If a real running variable has only a few discrete values, continuity alone does not identify that limit: more people at those same scores do not fill the gap. Such a design needs defensible extrapolation assumptions or a separately justified local-randomization approach, with inference matched to that approach.

Real outcomes fluctuate, and a locally straight approximation can have bias. Use an appropriate bandwidth procedure and inference method, inspect sensitivity, and distinguish the fitted limit from the raw average in each group. The zero residuals in this constructed example provide no meaningful evidence of real-world precision. Eight conveniently arranged observations are not a sufficient design justification.

Even perfect recovery of the six-point jump would leave the causal argument separate. If mentoring also starts at score 80, the observed jump could concern the scholarship-and-mentoring package. If applicants can precisely manipulate scores, cases on the two sides may differ for other reasons. A local causal interpretation requires a credible assignment process and continuity assumptions; generalizing to applicants far from 80 needs additional evidence.

Use [[stats-check-overlap]] for broader counterpart questions and [[stats-instrumental-variables]] when the threshold changes treatment probability rather than determining treatment completely.

## Advanced notes: local effects and incomplete compliance

A sharp design changes treatment deterministically at the cutoff. In a fuzzy design, the probability of treatment changes instead. The causal interpretation then requires additional instrumental-variable assumptions and concerns the relevant local population, not necessarily everyone who might receive treatment.

Bandwidth choice determines which observations inform the local fit and creates a bias-variance tradeoff. Report the selection procedure and reasonable sensitivity analyses. An estimate that changes sign under modest defensible bandwidth changes may be less stable than one preferred specification suggests.

The identified effect is local to the threshold and context. Extending it to people far from the cutoff requires another argument. A well-identified local result can still be highly useful if the decision concerns moving or maintaining that threshold.

Use this pattern when a meaningful assignment rule creates a discontinuity. Do not manufacture a cutoff in a smooth predictor merely to create two groups. The source of causal leverage is the treatment-assignment mechanism, supported by continuity and other assumptions, rather than the existence of a convenient dividing line in a chart.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [The Effect](https://www.theeffectbook.net/ch-RegressionDiscontinuity.html)
- [Cattaneo and Titiunik: Regression Discontinuity Designs, section 3.5 on discrete scores](https://rdpackages.github.io/references/Cattaneo-Titiunik_2022_ARE.pdf)
- [Cattaneo, Idrobo, and Titiunik: A Practical Introduction to Regression Discontinuity Designs](https://mdcattaneo.github.io/books/Cattaneo-Idrobo-Titiunik_2020_CUP.pdf)
