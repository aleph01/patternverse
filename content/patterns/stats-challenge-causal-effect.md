---
id: stats-challenge-causal-effect
type: pattern
title: 'Challenge the Assumptions Behind a Causal Effect'
summary: 'Use targeted falsification, sensitivity analyses, and bounds to expose what a causal conclusion depends on.'
status: published
verses:
  - statistics
---

A careful observational analysis estimates a benefit, but its conclusion depends on an unmeasured characteristic having little influence. Reporting the estimate with a narrow standard error does not express that uncertainty about the identification assumptions.

The response is to challenge the causal argument through checks linked to its specific vulnerabilities. Use placebo comparisons, negative controls, sensitivity analyses, or partial-identification bounds where appropriate. Each answers a different question about the evidence.

## Look where the proposed effect should not occur

In a policy evaluation, apply the same design to a plausible earlier date before the policy existed. An apparent effect there can reveal background trends or specification problems. The placebo must be meaningful: finding no effect in an unrelated setting with little information is weak reassurance.

A negative-control outcome is chosen because the treatment should not causally affect it under a defensible model, while it may share relevant sources of bias. An unexpected association can challenge the analysis. A clean negative control does not prove the absence of every possible bias.

For an intervention with possible spillovers, inspect whether supposedly untreated units could be affected. The right response may be redefining treatment exposure or the causal target, rather than merely adding another robustness regression.

## Vary consequential assumptions

Suppose an estimated improvement is seven units and an omitted source of bias could plausibly account for two, five, or nine. A simple sensitivity display can show how the implied effect changes under those scenarios. A formal sensitivity model should explain what the bias parameter means and why the range is reasonable.

This is not permission to subtract arbitrary numbers until a preferred answer appears. Tie the assumptions to substantive evidence, validation data, or interpretable benchmarks. Report when the conclusion changes and whether that requires a modest or extreme departure from the main assumptions.

A second example concerns missing outcomes. Investigate how much worse the missing cases would need to be for an apparent benefit to disappear. This reveals dependence on the missingness assumptions without pretending the missing values are known.

## Worked example: connect a bias scenario to an interpretable cause

Suppose an observational analysis reports an **unadjusted treated-minus-control mean difference of +7 points**, with a **known standard error of 1 point** under a Normal sampling approximation. Its ordinary 95% interval is **7 ± 1.959964**, approximately **5.04 to 8.96 points**. That interval concerns sampling uncertainty within the analysis; it does not include an unknown omitted source of bias.

For a transparent teaching model, let U stand for a characteristic present or absent before treatment, such as previous relevant training. It is unmeasured here: the analyst does not have it in the records. “Binary” means it has two categories, present or absent.

Assume having U adds **10 points** to the outcome and that U is more common in the treated group by a proportion **d**. For instance, a twenty-percentage-point difference means d = 0.20, not 20. Assume U has the same ten-point contribution in both treatment groups and is the only remaining source of confounding. In other words, there is no interaction with treatment or additional residual confounding.

The resulting additive bias is **b = 10d**, and the bias-adjusted contrast is **7 − b**. These are “what if” assumptions, not estimates of U from the records. The table asks how much of the observed seven-point gap could be explained by this proposed imbalance.

The formula applies to this simple mean comparison. For an estimate already adjusted by regression or standardization, the imbalance must reflect that adjustment; the raw prevalence gap is not generally the right input.

| Prevalence difference d | Bias b; adjusted contrast |
| --- | --- |
| 0 | 0; +7 |
| 0.2 | 2; +5 |
| 0.5 | 5; +2 |
| 0.7 | 7; 0 |
| 0.9 | 9; −2 |

For example, if U occurs in **10%** of controls and **80%** of treated cases, then **d = 0.80 − 0.10 = 0.70**. With the assumed ten-point U relationship, the bias is seven points and the adjusted contrast is zero. Choosing those numbers explains what would overturn the estimate; it does not establish that such an imbalance or outcome relationship actually exists.

![The adjusted contrast falls from seven to minus two as assumed positive bias grows from zero to nine points. Conditional interval endpoints shift with the same fixed bias. The lower endpoint reaches zero at bias 5.04, while the point estimate reaches zero at bias seven.](../assets/statistics/causal-sensitivity.svg "The additive bias model assumes a constant ten-point outcome difference associated with U. Thin lines are conditional 95% interval endpoints for fixed, known bias values. They do not express uncertainty about the bias or constitute a probability distribution over scenarios.")

The point estimate reaches zero when **b = 7**. A different boundary concerns the conditional interval: its lower endpoint reaches zero at **b = 7 − 1.959964 ≈ 5.04**. With fixed bias five, the adjusted estimate is two and the interval is about **0.04 to 3.96**. With fixed bias seven, the estimate is zero and the interval is **−1.96 to 1.96**. “The point estimate changes sign” and “the interval includes zero” are different statements.

Subtracting the same bias from both interval endpoints is legitimate in this arithmetic only because each scenario treats b as fixed and known. If b is estimated or uncertain, that extra uncertainty needs appropriate treatment. Likewise, a more realistic omitted-variable model can change the standard error as well as the estimate. The simple shifted interval is not a general sensitivity-analysis recipe.

Choose a plausible scenario range using subject knowledge, recorded covariates, external validation, or explicit benchmarks. A five-point bias can be modest or extreme depending on the setting. A numerical tipping point without that context cannot decide whether the conclusion is robust. Negative bias would move the contrast in the other direction and should be examined if substantively plausible.

Finally, use checks aimed at other vulnerabilities. A pre-policy placebo can challenge the trend argument, while a negative-control outcome can probe a proposed pathway. Passing one check does not identify U or verify every causal assumption. Use [[stats-draw-causal-model]] to describe the vulnerability and [[stats-missingness]] when the consequential unknown concerns unavailable outcomes.

## Advanced notes: sometimes a range is the answer

When point identification is not defensible, partial identification can characterize a set of effects consistent with stated assumptions and the observations. Bounds can be wide yet scientifically informative, especially when they exclude a consequential region or show exactly which additional assumption would narrow the conclusion.

Distinguish sampling uncertainty from uncertainty about assumptions. A sensitivity curve conditional on several bias values is not automatically a posterior distribution over those values. A confidence interval around a bound also requires an appropriate inferential procedure.

Avoid robustness theater: many nearly identical model variants can leave the same central weakness untouched. Choose checks that could genuinely contradict the proposed causal explanation. Conversely, one failed diagnostic may indicate a specific repair or a narrower target rather than a universal verdict about all observational inference.

Use this pattern whenever an important claim rests on assumptions the data cannot verify directly. Present the primary estimate, the causal argument, the most consequential challenges, and the resulting limits together.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [The Effect](https://www.theeffectbook.net/ch-DifferenceinDifference.html)
- [Hernán and Robins — Causal Inference: What If](https://content.sph.harvard.edu/wwwhsph/sites/1268/2024/04/hernanrobins_WhatIf_26apr24.pdf)

- [Cinelli and Hazlett: Making sense of sensitivity](https://escholarship.org/uc/item/0pg6471b)

