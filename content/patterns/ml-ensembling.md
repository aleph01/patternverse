---
id: ml-ensembling
type: pattern
title: 'Ensembling'
summary: 'Combine compatible predictions from multiple models, testing whether their different errors justify the added training and serving cost.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

Three demand models have similar average forecasting error. One tends to overshoot when another undershoots, suggesting that a combined forecast might be more reliable. But if all three miss the same holiday surge, combining them will preserve the mistake.

Ensembling combines predictions from multiple models. Its purpose is to improve the useful behavior of the whole system, not to accumulate models. Whether it helps depends on the members, their error patterns, the combination rule, and the task being evaluated.

## Core idea

Begin with a simple rule: average predictions that refer to the same quantity. Opposing errors can cancel, while shared errors remain. A member need not be best on its own to contribute something useful, but adding a weak or redundant member can provide little benefit or make the result worse.

For classification, one option is to vote on class labels. Another is to average compatible class probabilities before choosing a label. These rules use different information and can disagree. Establish the combination rule explicitly rather than treating “the ensemble” as a single universal algorithm.

## How it works

Train candidate models using training data, then compare their predictions on the same validation cases. Examine where they fail together as well as their individual scores. Variation can come from training samples, features, model families, or random initialization, but different architectures or seeds do not guarantee useful differences.

Start with an unweighted average or vote. Select members, weights, and any thresholds using validation evidence. Compare the combined system with the best eligible single model and a credible simple baseline. Keep final evaluation outside those choices, including repeated manual attempts to find a favorable combination.

Some methods build the ensemble during training. **Bagging** fits members on resampled datasets; random forests also randomize candidate features during tree construction. **Boosting** builds an additive model in stages, with later components chosen to improve the current objective. The [scikit-learn ensemble guide](https://scikit-learn.org/stable/modules/ensemble.html) documents these mechanisms. Boosting is not simply independent models taking a majority vote.

**Stacking** fits a further model to combine member outputs. Give this combiner predictions produced without training each member on the same row's label, for example through appropriate out-of-fold predictions. Scikit-learn's [StackingRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.StackingRegressor.html) documents this procedure and warns about training the combiner on predictions from models fitted on the same data. Time and entity boundaries still need suitable splits.

## Worked examples

### Similar individual error, different combined error

Consider six fictional daily demand forecasts, measured in orders. All predictions and outcomes are invented; no models are trained here.

| Day | Actual orders | Model A | Model B | Model C |
| --- | ------------: | ------: | ------: | ------: |
| 1   |            10 |      16 |      10 |       4 |
| 2   |            20 |      14 |      26 |      20 |
| 3   |            30 |      30 |      24 |      36 |
| 4   |            40 |      46 |      40 |      34 |
| 5   |            50 |      44 |      56 |      50 |
| 6   |            60 |      60 |      54 |      66 |

A **signed error** is forecast minus actual. On day one, the errors are **+6, 0, −6 orders**. Their average is zero, and the average forecast is **(16 + 10 + 4)/3 = 10 orders**, exactly the actual count.

The same cancellation occurs on every displayed day. Each member has four errors of magnitude six and two of zero, so its **mean absolute error (MAE)** is **(6 + 6 + 0 + 6 + 6 + 0)/6 = 4 orders**. The equal-weight average has MAE **zero** on these six constructed cases.

Now give all three models A's forecasts. Each still has MAE four, but their average is identical to A and also has MAE **four orders**. The number of models and their individual summary scores stayed the same; their error arrangement changed.

![Signed forecast errors for three models cancel in the complementary case but remain in the shared-error case. Every individual model has mean absolute error four orders, while the equal-weight combination has zero or four.](../assets/machine-learning/ensembling.svg 'Follow each case column through the three member errors to the combined error. Opposing errors cancel in the first comparison; shared errors survive in the other. Equal individual MAE does not establish that models will complement one another.')

The explorer computes combinations, signed errors, MAE, and root mean squared error from these records. It offers an equal mean, a mean giving A twice the weight, and a median. Changing the rule or scenario does not train or tune models. The displayed outcomes are teaching evidence, not an independent benchmark to optimize against.

```patternverse-widget
{
  "src": "ml-ensembling.html",
  "title": "Ensemble error patterns explorer",
  "height": 1200,
  "fallback": "Three fictional forecasters each have MAE four orders. Their equal average has MAE zero when opposing errors cancel, but four orders when all three share the same errors. Adding models alone does not establish improvement."
}
```

### A poor member can dominate an average

In another fictional scenario, A and B miss by two orders in opposite directions on every day. Their two-model mean is exact. Add C, which overpredicts by 30 orders each day. The three-model mean now overpredicts by **(2 − 2 + 30)/3 = 10 orders**, with MAE **10**. Each of the better members alone had MAE **two**.

The median takes the middle forecast instead of the arithmetic mean. Here its error is **+2 orders** each day, giving MAE two. It limits this particular outlier's influence without beating the better members. It can also discard useful information in other cases; robustness to one extreme member is not universal superiority.

Scikit-learn's [VotingRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.VotingRegressor.html) documents averaging individual predictions, including optional weights. The explorer's median is a separate combination rule, not a VotingRegressor setting.

### Labels and probabilities can disagree

Three fictional binary classifiers assign positive-class probabilities **0.51, 0.51, and 0.01** to one case. At threshold 0.5, two vote positive, so hard voting returns positive. Their average probability is **1.03/3 ≈ 0.343**, so soft voting returns negative.

[VotingClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.VotingClassifier.html) documents both approaches. Neither decision is established as correct without the outcome. Probabilities must refer to the same class, and useful probability estimates matter when averaging them. Averaging alone does not certify calibration.

## Assumptions for correctness

Members must predict the same target, units, time horizon, and class meaning, with aligned records and available information. Combining tomorrow's orders with next week's orders is not repaired by averaging.

Complementarity must persist on relevant new cases. [Breiman's random-forest paper](https://www.stat.berkeley.edu/~breiman/randomforest2001.pdf) analyzes the roles of member strength and dependence in that method. The toy's exact cancellation illustrates the importance of joint errors; it does not reproduce forest training or establish future error rates.

## When to use it

Consider ensembling when credible models have different useful error patterns and validation shows a gain worth the operating cost. Bagging can be useful when a fitted learner changes substantially across training samples. Stacking is worth considering when there is enough independent evidence to fit a combiner.

Retain a single model when the gain is negligible, members are redundant, or deployment constraints dominate.

## Tradeoffs and operating costs

Training, storing, updating, and monitoring multiple models adds work. Parallel execution may reduce wall-clock latency but still consumes resources and can be limited by the slowest member. Measure the complete serving system rather than multiplying a single-model benchmark optimistically.

Specify what happens when a member times out. Renormalizing remaining weights changes the predictor and needs evaluation. Version the member set and combination rule together.

## Common mistakes and limitations

Do not choose weights on final test labels, count duplicated checkpoints as independent evidence, or mistake disagreement for a calibrated uncertainty interval. Members can agree and all be wrong. Shared bias, missing information, and distribution shift can survive every vote.

The six-case explorer trains no members, estimates no population uncertainty, and measures no serving speed. Exact cancellation was constructed deliberately. More cases, relevant slices, and independent evaluation are needed for an application claim.

## Related patterns

[[ml-cascade|Cascade]] spends later computation only on cases that continue, rather than combining every member’s prediction. [[ml-multimodal-input|Multimodal Input]] combines observation types; prediction-level fusion can overlap with ensembling. [[ml-knowledge-distillation|Knowledge Distillation]] can train one student from an expensive ensemble's behavior. [[ml-probability-calibration|Probability Calibration]] addresses the meaning of combined probability outputs. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects member and combiner fitting boundaries. [[ml-heuristic-benchmark|Heuristic Benchmark]] asks whether a combined system earns its complexity over a simpler alternative.

## Sources and further reading

- [Scikit-learn: ensemble guide](https://scikit-learn.org/stable/modules/ensemble.html) — bagging, random forests, boosting, voting, and stacking.
- [Scikit-learn: VotingRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.VotingRegressor.html) — weighted and unweighted prediction averaging.
- [Scikit-learn: VotingClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.VotingClassifier.html) — hard and soft voting.
- [Scikit-learn: StackingRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.StackingRegressor.html) — out-of-fold combiner inputs and overfitting risks.
- [Breiman: Random Forests](https://www.stat.berkeley.edu/~breiman/randomforest2001.pdf) — a documented ensemble method and analysis of strength and dependence.
