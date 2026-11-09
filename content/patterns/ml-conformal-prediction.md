---
id: ml-conformal-prediction
type: pattern
title: 'Conformal Prediction'
summary: 'Use held-out prediction errors to construct sets or intervals with finite-sample marginal coverage under exchangeability, while measuring how informative those sets remain.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A repair-time model predicts 40 minutes. A dispatcher needs to reserve a time slot, but the point estimate gives no indication of how far the actual duration might differ. An arbitrary “plus or minus ten minutes” would look precise without explaining what it covers.

Conformal Prediction turns held-out examples into a rule for constructing prediction intervals or label sets. It connects a chosen coverage target to an explicit procedure, while leaving the usefulness of the resulting set as a separate question.

## Core idea

Use a fixed model to measure how unusual each calibration outcome looks. Choose a threshold from those scores, then include candidate outcomes whose scores are no larger than that threshold.

The procedure aims to cover future outcomes at a chosen rate. It relies on **exchangeability**: reordering the calibration and new examples would leave their joint distribution unchanged. Independent examples drawn from the same distribution satisfy this condition. Under it, a fixed scoring rule and the corrected rank below give at least the target coverage, averaged over calibration samples and new examples.

This is **marginal coverage**. It is not a guarantee for every feature value, subgroup, realized calibration dataset, or finite evaluation batch. The interval concerns a future outcome, rather than a population mean or model parameter. [Lei and colleagues](https://arxiv.org/abs/1604.04173) develop distribution-free predictive inference for regression and its coverage properties.

## How it works

Keep three data roles separate. Fit and select the base model using training data. Use fresh calibration labels to determine the conformal threshold. Evaluate the completed procedure on separate cases. Fix the score rule before using the calibration labels; searching many alternatives on those labels requires additional care.

For a simple regression interval, the score is the **absolute residual**: the absolute difference between observed and predicted duration. Sort the n calibration scores. If the tolerated miscoverage is α, select rank **k = ceil((n + 1)(1 − α))**, counting from one. “Ceil” means round upward.

When k is at most n, let q be the kth smallest score and return **[prediction − q, prediction + q]**. Include the endpoints. Ties can make coverage conservative. If k exceeds n, the extended-quantile rule uses **q = infinity**; silently replacing it with the largest finite error would not support the requested level.

The finite-sample rank correction is not an ordinary interpolated percentile. The [Angelopoulos–Bates introduction](https://arxiv.org/abs/2107.07511) explains score-based prediction sets and their construction. [MAPIE's documented workflow](https://github.com/scikit-learn-contrib/MAPIE/blob/master/doc/content/conformal-prediction/split-cross-conformal.md) implements separate fitting, conformalization, and evaluation, including use with an already fitted model.

## Worked examples

### Nine errors determine an interval

In a fictional repair dataset, a frozen model produces nine calibration predictions. Their observed absolute errors, in record order, are **4, 1, 7, 2, 9, 3, 5, 2, 4 minutes**. Sorting gives:

| Rank           |   1 |   2 |   3 |   4 |   5 |   6 |   7 |   8 |   9 |
| -------------- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Error, minutes |   1 |   2 |   2 |   3 |   4 |   4 |   5 |   7 |   9 |

There are n = 9 errors. A 90% target means α = 0.10, so **k = ceil((9 + 1) × 0.90) = 9**. Counting from the smallest error, rank nine is **q = 9 minutes**. A new point prediction of 40 minutes receives **[31, 49]**, width **18 minutes**. Its outcome is still unknown.

For an 80% target, rank eight gives q = 7 and interval **[33, 47]**. At 95%, rank ten exceeds the nine available scores: this real-valued interval rule returns the whole real line. It supplies no finite planning bound at that setting. That limitation should remain visible rather than being hidden by a convenient software default.

![Nine sorted calibration errors select rank nine for a ninety-percent target, producing a nine-minute radius around a forty-minute prediction. Separate evaluation covers nine of ten cases, with uneven group results.](../assets/machine-learning/conformal-prediction.svg 'Rank nine selects a nine-minute radius around a new prediction. Separate evaluation then checks coverage, including uneven routine and complex results. The 90% target concerns the procedure under exchangeability, not each case or batch.')

The explorer computes scores from calibration predictions and outcomes, sorts them, selects the corrected rank, and evaluates the resulting intervals. It can use the first three, five, or all nine fixed calibration records. Those subsets contain different errors; changing sample size does not isolate sample size from sample composition.

```patternverse-widget
{
  "src": "ml-conformal-prediction.html",
  "title": "Conformal prediction interval explorer",
  "height": 1200,
  "fallback": "Nine fictional calibration errors give radius nine for a 90% target: [31, 49] around prediction 40. At 95% the corrected rank requires an unbounded interval. Coverage is marginal under exchangeability."
}
```

### Overall coverage can conceal uneven results

Ten different fictional evaluation cases have absolute errors **1, 2, 3, 4, 5, 6, 7, 8, 9, 12**. With q = 9, nine outcomes lie within their intervals. The first eight routine cases get **8/8** coverage; the two complex cases get **1/2**. Overall **9/10** does not imply 90% coverage in both groups.

At the 80% target, q = 7 covers only **7/10** in this fixed batch. Neither result proves or disproves a population guarantee from ten fabricated observations. The explorer also offers a harder-complex scenario; changing evaluation outcomes leaves q unchanged, demonstrating evaluation rather than refitting.

Constant-width intervals may overcover easy cases while missing difficult ones. Conformalized quantile regression, documented by [Romano, Patterson, and Candès](https://proceedings.neurips.cc/paper_files/paper/2019/hash/5103c3584b063c431bd1268e9b5e76fb-Abstract.html), adjusts estimated quantile bounds to obtain more adaptive intervals. Adaptivity alone does not provide coverage conditional on every input. [MAPIE's coverage discussion](https://github.com/scikit-learn-contrib/MAPIE/blob/master/doc/content/conformal-prediction/conditional-guarantees.md) distinguishes marginal guarantees from methods targeting predefined groups.

### Classification returns possible labels

For a separate fictional classifier, define the score of a candidate label as **1 minus its predicted probability**. On nine labeled calibration cases, suppose the true-label scores sort to **0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80**.

An 80% target again selects rank eight, giving q = 0.70. Include labels with candidate scores at most 0.70. For Delivery/Billing/Account probabilities **[0.50, 0.35, 0.15]**, the scores are **[0.50, 0.65, 0.85]**, so the set is **{Delivery, Billing}**. A more confident **[0.85, 0.10, 0.05]** gives **{Delivery}**.

These probabilities need not already be perfectly calibrated for the conformal rank argument. Their quality affects set usefulness. Returning one top label regardless of the constructed set changes the output and can discard its coverage property.

## Assumptions for correctness

The exchangeability assumption must suit the calibration and future cases. Ordinary split conformal does not automatically handle chronological drift, repeated-customer dependence, or selection into a different population. Shuffling rows does not repair those problems.

Keep preprocessing, model parameters, scoring, and calibration compatible. Do not refit the base model on calibration labels and reuse its old threshold as though the construction were unchanged. The explorer's synthetic records illustrate arithmetic; they do not establish exchangeability in a real repair operation.

## When to use it

Use conformal prediction when a system can act on an interval or set and a clearly stated coverage target matters. Examples include reserving capacity for uncertain durations or routing ambiguous classifications for review.

Assess usefulness as well as coverage. A very wide interval or a set containing every label may cover well while providing little help.

## Tradeoffs and operating costs

Split conformal reserves labeled data and stores calibration scores or their threshold. Better base predictions and task-appropriate scores can make sets smaller. More elaborate methods can improve data efficiency or adapt width, but their computational cost and coverage statements differ.

Specify how downstream systems handle unbounded intervals, large sets, and empty classification sets. Monitor empirical coverage and size after deployment as labels become available.

## Common mistakes and limitations

Do not describe a 90% conformal interval as a 90% posterior probability for this particular realized case. Do not infer simultaneous coverage of an entire batch from a marginal guarantee.

Clipping intervals or dropping plausible labels for presentation can change coverage. Repeatedly selecting scores or thresholds using final evaluation outcomes also compromises the evaluation. Distribution-free means avoiding a specified error-distribution family; it does not mean assumption-free or protected against arbitrary distribution shift.

## Related patterns

[[ml-probability-calibration|Probability Calibration]] targets the interpretation of probability values; conformal prediction targets set coverage. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks where coverage and width differ. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects fitting and reporting boundaries. **Quantile Regression** estimates conditional quantiles and can supply bounds to conformalize; estimated quantiles alone do not automatically obtain the same finite-sample guarantee.

## Sources and further reading

- [Lei and colleagues: Distribution-Free Predictive Inference for Regression](https://arxiv.org/abs/1604.04173) — regression prediction sets and coverage theory.
- [Angelopoulos and Bates: A Gentle Introduction](https://arxiv.org/abs/2107.07511) — scores, rank correction, prediction sets, and limitations.
- [MAPIE: split and cross conformalization](https://github.com/scikit-learn-contrib/MAPIE/blob/master/doc/content/conformal-prediction/split-cross-conformal.md) — documented implementation and data roles.
- [Romano, Patterson, and Candès: Conformalized Quantile Regression](https://proceedings.neurips.cc/paper_files/paper/2019/hash/5103c3584b063c431bd1268e9b5e76fb-Abstract.html) — adaptive interval construction.
- [MAPIE: conditional guarantees](https://github.com/scikit-learn-contrib/MAPIE/blob/master/doc/content/conformal-prediction/conditional-guarantees.md) — marginal, adaptive, and group coverage distinctions.
