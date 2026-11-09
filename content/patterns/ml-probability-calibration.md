---
id: ml-probability-calibration
type: pattern
title: 'Probability Calibration'
summary: 'Fit and validate a mapping from model scores to probabilities whose stated likelihoods agree with observed event frequencies in the intended setting.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A maintenance model assigns a 90% chance of a service issue to ten incoming requests. Only seven have the issue. It may still rank the requests usefully, but planning visits as though nine issues were expected would rely on probabilities that are too extreme for these cases.

Probability Calibration addresses the meaning of those numbers. It seeks probability estimates that agree with observed frequencies on relevant data, while recognizing that a small sample cannot establish long-run reliability.

## Core idea

For a calibrated binary predictor, cases assigned a probability near 0.8 should have the positive outcome approximately 80% of the time. This concerns groups of comparable predictions, not a promise that a particular case will be positive.

Calibration differs from ranking and classification. A model can order cases well yet overstate their probabilities. Conversely, always predicting the population's event rate can be calibrated while offering no useful discrimination between cases.

A post-processing calibrator learns a mapping from the base model's fixed scores to probabilities. The mapping is another fitted component, with its own data requirements and failure modes.

## How it works

Define the event, label horizon, population, and meaning of the predicted probability. Train the base model, then fit a calibrator using labeled predictions that were not used to fit that base model. Reserve independent evaluation for the completed system. Cross-validation can generate out-of-fold calibration predictions, with splits that respect entities and time.

Common mappings include a fitted sigmoid, a nondecreasing isotonic function, and temperature scaling. Scikit-learn's [CalibratedClassifierCV](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html) documents these approaches and the need to separate base-model fitting from calibration data. Flexible mappings require sufficient evidence; isotonic fitting can overfit small samples.

For binary logits, temperature scaling uses **p = 1 / (1 + exp(−z/T))**, with **T > 0**. A logit z is the score before the logistic transformation. Larger temperatures bring probabilities toward 0.5; smaller temperatures make them more extreme. Fit T by minimizing calibration-set log loss, then freeze it.

Evaluate both probability quality and the task's other requirements. A reliability diagram compares average predicted probability with the positive-outcome fraction in each bin. Report bin counts as well. [Calibration-curve documentation](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.calibration_curve.html) explains this grouping and the tradeoff between detail and sample size.

## Worked examples

### A fitted temperature, checked on different cases

Consider a fictional frozen model with two logits, **−ln(9)** and **+ln(9)**, giving raw probabilities **0.1** and **0.9**. Each calibration group contains ten cases. The low-score group has two positive labels; the high-score group has eight.

The desired calibration fractions are 2/10 = 0.2 and 8/10 = 0.8. A logit of **ln(4)** maps to 4/(1 + 4) = 0.8. Dividing the high raw logit ln(9) by **T = ln(9)/ln(4) ≈ 1.5850** therefore gives ln(4); the negative logit similarly maps to 0.2. This minimizes calibration log loss within the explorer’s range **0.25 ≤ T ≤ 10**. The mapped probabilities become **0.2** and **0.8**. This exact solution uses the toy's equal-magnitude logits; it is not a general fitting formula for arbitrary models.

Now evaluate on 20 separate cases, with different identifiers:

| Evaluation group | Cases | Positive outcomes | Raw probability | Mapped probability |
| ---------------- | ----: | ----------------: | --------------: | -----------------: |
| Low score        |    10 |                 3 |             0.1 |                0.2 |
| High score       |    10 |                 7 |             0.9 |                0.8 |

The observed fractions are **0.3** and **0.7**. Mapping has reduced the mismatch, without eliminating it. Predictions at a 0.5 threshold remain unchanged: **14/20 = 70%** accuracy before and after.

The binary Brier loss averages **(p − y)²**, with y = 1 for an issue and 0 otherwise. A positive case predicted at 0.2 contributes (0.2 − 1)² = 0.64. Averaging all evaluation cases, Brier loss falls from **0.2500** to **0.2200**. Mean log loss, using natural logarithms, falls from **0.7645** to **0.6390**. These describe the fixed evaluation cases, not a guaranteed improvement on future requests. The [Brier-loss reference](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.brier_score_loss.html) specifies this binary convention; the [log-loss reference](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.log_loss.html) specifies the probabilistic loss.

![Calibration uses separate labels to fit a temperature, moves ten- and ninety-percent predictions to twenty and eighty percent, and checks them against independent thirty- and seventy-percent observed frequencies. Classification accuracy stays seventy percent.](../assets/machine-learning/probability-calibration.svg 'Mapped predictions move horizontally toward the observed frequencies; the outcomes do not change. Separate records fit the mapping and evaluate it. Better losses here do not establish perfect population calibration.')

The explorer creates the records, fits the bounded temperature from calibration labels only, and computes evaluation losses and reliability bins. Changing evaluation outcomes never refits the temperature. A scenario where evaluation frequencies are already 0.1 and 0.9 makes this fitted mapping worse, illustrating that calibration evidence may not transfer.

```patternverse-widget
{
  "src": "ml-probability-calibration.html",
  "title": "Probability calibration fitting explorer",
  "height": 1200,
  "fallback": "Separate calibration labels fit T ≈ 1.5850, moving 0.1/0.9 predictions to 0.2/0.8. Evaluation probability losses improve in the default fictional case, while 0.5-threshold accuracy remains 14/20."
}
```

### A coarse summary can conceal the problem

Pool those evaluation cases into one broad reliability bin. Their average prediction is **0.5**, and ten of twenty outcomes are positive: also **0.5**. The bin looks perfect before and after calibration, despite the mismatches within the two score groups.

The explorer's positive-class binned error is the count-weighted mean absolute difference between each bin's average prediction and outcome fraction. With five equal-width bins, it changes from **0.20** to **0.10**; with one bin, both values are **zero**. Bin choice changed the summary, not the probabilities or losses. Empty bins supply no evidence.

Do not confuse this positive-event calculation with top-label confidence calibration in multiclass classification. The [scikit-learn calibration guide](https://github.com/scikit-learn/scikit-learn/blob/main/doc/modules/calibration.rst) also explains why proper scores assess discrimination and uncertainty alongside calibration: a lower Brier loss alone is not a pure measure of calibration.

### Probabilities and decisions meet at a cost threshold

In another fictional maintenance decision, a visit costs 85 units and certainly prevents a loss of 100 units if the issue exists. Assume risk-neutral decisions and no other effects. Expected net benefit is **100p − 85**, so a visit is worthwhile when p exceeds **0.85**.

At p = 0.9, estimated benefit is **5**; at p = 0.8, it is **−5**. The probability mapping can therefore change this decision even though the class at threshold 0.5 stays positive. Calibration does not establish that the visit actually prevents the loss; that is a separate assumption about intervention effects.

## Assumptions for correctness

Labels must represent the claimed event and be sufficiently mature and accurate. Calibration and evaluation data must reflect the setting in which probabilities will be interpreted, with relevant dependence and sampling handled appropriately.

Keep the model, preprocessing, class order, and calibration mapping compatible. A single temperature preserves binary score ordering and the 0.5 decision boundary; it cannot correct every asymmetric probability bias or reverse an incorrect ranking.

## When to use it

Use calibration when probabilities inform expected costs, resource planning, risk communication, or confidence-based routing. First check whether the existing probabilities need adjustment. A ranking-only workflow may benefit less, although later decisions can still require meaningful probabilities.

## Tradeoffs and operating costs

Calibration consumes labeled data and adds a fitted artifact to serving and versioning. Flexible methods can reduce bias while increasing variance. Updating the base model or population may require new calibration evidence.

[Guo and colleagues](https://proceedings.mlr.press/v70/guo17a.html) documented temperature scaling's effectiveness in their neural-network experiments. [Minderer and colleagues](https://proceedings.neurips.cc/paper/2021/hash/8420d359404024567b5aefda1231af24-Abstract.html) later found that calibration trends vary across newer architectures. Neither result makes recalibration universally necessary or successful.

## Common mistakes and limitations

Fitting the mapping on the final evaluation labels leaks information into the reported result. Repeatedly choosing methods by final-set performance also turns that set into development data.

Global calibration can hide subgroup failures. Small bins have noisy observed frequencies, and class imbalance can leave rare events poorly assessed. Distribution shift can invalidate an earlier mapping. Binning, a good proper score, or unchanged accuracy cannot certify trustworthy probabilities for every case.

## Related patterns

[[ml-reframing|Reframing]] changes what a model predicts; calibration checks whether its probability values match observed frequencies. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects fitting and reporting boundaries. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks reliability across conditions and populations. **Threshold Selection** converts probabilities into actions using costs or constraints. [[ml-conformal-prediction|Conformal Prediction]] targets coverage of prediction sets under its assumptions, rather than calibrating individual class probabilities. [[ml-knowledge-distillation|Knowledge Distillation]] uses softened teacher outputs as training targets; that use of temperature serves a different purpose.

## Sources and further reading

- [Scikit-learn: CalibratedClassifierCV](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html) — fitting methods and separation of training and calibration.
- [Scikit-learn: calibration_curve](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.calibration_curve.html) — reliability diagrams and bin counts.
- [Scikit-learn: Brier loss](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.brier_score_loss.html) — binary squared-probability loss.
- [Scikit-learn: log loss](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.log_loss.html) — probabilistic cross-entropy loss.
- [Scikit-learn: calibration guide source](https://github.com/scikit-learn/scikit-learn/blob/main/doc/modules/calibration.rst) — probability interpretation and proper-score limitations.
- [Guo and colleagues: On Calibration of Modern Neural Networks](https://proceedings.mlr.press/v70/guo17a.html) — temperature scaling and empirical results.
- [Minderer and colleagues: Revisiting the Calibration of Modern Neural Networks](https://proceedings.neurips.cc/paper/2021/hash/8420d359404024567b5aefda1231af24-Abstract.html) — architecture-dependent findings and limits to broad claims.
