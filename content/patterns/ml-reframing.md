---
id: ml-reframing
type: pattern
title: 'Reframing'
summary: 'Change the learning target and output representation so the model supplies information the application can use, while making discarded detail and new assumptions explicit.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A delivery app predicts an arrival in 20 minutes. For similar trips, however, deliveries usually arrive in about 10 minutes or about 30 minutes, depending on a condition the recorded inputs do not reveal. Twenty minutes summarizes the observations but describes neither common outcome. A customer asking “could it take at least 25 minutes?” needs information that this single number does not contain.

Reframing changes what the learning problem asks the model to produce. Instead of tuning the same point predictor indefinitely, the team might predict probabilities over arrival-time bands. The question becomes whether the new output supports the intended use better, at an acceptable loss of detail.

## Core idea

Separate the real-world outcome from its learning representation. The outcome remains a duration in minutes; its target can be the duration itself, a duration band, or an indicator of crossing a particular deadline.

Changing that target changes what training rewards. Squared-error regression asks for a point estimate. Classification into time bands asks for probabilities of mutually exclusive ranges. A direct late/not-late classifier instead focuses on one chosen deadline.

These outputs answer different questions. None is inherently more sophisticated or correct. Choose a representation for the information the application needs, then define how that output becomes a displayed estimate or decision.

## How it works

Write down the outcome, the available inputs, the prediction time, and the downstream use. Specify what the current output fails to express before choosing a new formulation.

For band classification, assign each observed duration to exactly one range and train a classifier on those labels. At prediction time, retain the vector of class probabilities rather than immediately reducing it to the most likely band. Define range boundaries, units, out-of-range handling, and any reconstruction rule as part of the model contract.

Use the same information boundaries and held-out cases to compare formulations. Evaluate both their native outputs and their usefulness for the application. A change from minute error to classification accuracy can create an apparent improvement simply by changing the question.

The book authors’ [Reframing notebook](https://github.com/GoogleCloudPlatform/ml-design-patterns/blob/master/03_problem_representation/reframing.ipynb) demonstrates representing a numerical target through bins and classification. This article uses a separate fictional example; its calculations do not reproduce the notebook’s training or reported results.

## Worked examples

### One average conceals two common outcomes

Consider six fictional deliveries with the same recorded input features:

| Delivery | Observed duration |
| -------- | ----------------: |
| A        |         8 minutes |
| B        |        10 minutes |
| C        |        12 minutes |
| D        |        28 minutes |
| E        |        30 minutes |
| F        |        32 minutes |

With no distinguishing feature, fit one constant prediction by minimizing squared error. The minimizing value is the mean: **(8 + 10 + 12 + 28 + 30 + 32)/6 = 20 minutes**. Its squared errors are **144, 100, 64, 64, 100, and 144 minute²**, giving mean squared error **616/6 ≈ 102.67 minute²**. This is the best constant for that loss, even though no delivery took near 20 minutes.

Now encode the same targets into three bands: **[0, 15)**, **[15, 25)**, and **[25, 40)** minutes. A left bracket includes the boundary; a right parenthesis excludes it. The counts are **3, 0, 3**. A constant categorical fit by observed frequencies therefore assigns **0.50, 0, 0.50**. The demonstration assumes all durations lie from zero up to, but excluding, 40 minutes.

At the aligned 25-minute boundary, the fitted mass for **duration ≥ 25** is the final band’s **0.50**. Comparing the point prediction with 25 gives only **20 ≥ 25: false**; that Boolean is not an estimate of the chance of a late delivery.

![Six fictional delivery durations form two groups. A squared-error constant gives 20 minutes between them; three target bands preserve masses 0.50, zero, and 0.50, with half the fitted mass at or beyond 25 minutes.](../assets/machine-learning/reframing.svg 'Compare the single mean with the mass retained in each band. Both are fitted to the same observations. The deadline aligns with a band boundary, so its fitted tail mass can be summed without assuming where durations lie inside that band.')

The explorer fits the constant mean and band frequencies directly from its displayed observations. Change the sample, band layout, or deadline. It computes training summaries, not a feature-dependent predictor or a measured estimate of future reliability. Repeated inputs are not a requirement for reframing; they isolate why different targets retain different information.

```patternverse-widget
{
  "src": "ml-reframing.html",
  "title": "Reframing targets and information explorer",
  "height": 1200,
  "fallback": "For six fictional durations 8, 10, 12, 28, 30 and 32 minutes, the squared-error constant is 20 minutes. Three bands retain masses 0.50, 0 and 0.50. At the 25-minute band boundary, the fitted mass at or above the deadline is 0.50. Coarser bands may require an explicit within-band assumption."
}
```

### Coarser bands cannot answer every deadline exactly

Merge the targets into **[0, 20)** and **[20, 40)**. Their masses remain one-half each. But the 25-minute deadline now cuts through the second band. From those two masses alone, the fitted fraction at or beyond 25 could be anywhere from **0 to 0.50**.

If we additionally assume durations are uniformly distributed within each band, the second band’s fraction above 25 is **(40 − 25)/(40 − 20) = 15/20**. Multiplying by its mass gives **0.50 × 15/20 = 0.375**. That assumption produces a number; it does not recover the observed fraction **3/6 = 0.50**.

Likewise, assigning each coarse band its midpoint yields **0.50 × 10 + 0.50 × 30 = 20 minutes** here. Agreement with the original mean is incidental; midpoint reconstruction generally loses within-band information. The explorer exposes these calculations separately from what the band masses establish.

### Sometimes the target should be a decision or a quantile

Suppose the only required output is whether a delivery reaches a fixed 25-minute boundary. A binary target can label each observation directly using that rule. It avoids choosing several bands, but changing the deadline later changes the label definition. Google’s [problem-framing guide](https://developers.google.com/machine-learning/problem-framing/ml-framing) discusses this relationship between prediction types and application thresholds.

Alternatively, an arrival promise might require a high conditional quantile: a duration below which a specified share of outcomes should fall for given inputs. [Scikit-learn’s QuantileRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.QuantileRegressor.html) implements quantile fitting through pinball loss. This is a documented alternative to bin classification; the explorer runs neither that estimator nor a delivery-promise system.

## Assumptions for correctness

The transformed labels must preserve the distinctions needed downstream. Bands require unambiguous boundaries and coverage of valid outcomes. Data-dependent boundaries must be fitted without using evaluation outcomes. Retain raw targets when future questions may require their detail.

Training data must support useful conditional probabilities; a histogram of a tiny sample does not establish calibrated future probabilities. Missing predictors, drift, and selective outcome collection can still undermine every formulation. [Scikit-learn’s evaluation guide](https://scikit-learn.org/stable/modules/model_evaluation.html) distinguishes probability losses from label accuracy and numerical error measures.

## When to use it

Consider reframing when a single estimate hides operationally relevant uncertainty, the product needs a stable category rather than numerical precision, or the current loss rewards behavior that does not serve the application.

Keep an ordinary regression formulation when numerical detail matters and its output already supports the decision. Distributional regression and quantile methods can address uncertainty without introducing fixed bands.

## Tradeoffs and operating costs

More bands preserve resolution but require enough evidence per range and add outputs to train, calibrate, and monitor. Unequal-width bands describe different amounts of numerical space; equal probability mass does not mean equal probability density.

Label definitions, boundaries, reconstruction rules, and thresholds need versioning alongside weights. Changing them can require relabeling data, retraining, and updating consumers. Preserve an evaluation bridge to the original outcome and application costs.

## Common mistakes and limitations

Regression is not “confused” merely because similar inputs have different outcomes. Conditional variability is normal; squared-error prediction intentionally summarizes it with a mean. Reframing changes the information requested rather than eliminating that variability.

Do not treat band IDs as meaningful numeric distances, compare unlike metrics as though they were interchangeable, or call a midpoint-weighted sum an exact recovered expectation. Ordinary multiclass loss also does not automatically penalize distant wrong bands more than neighboring ones.

## Related patterns

[[ml-multilabel|Multilabel]] is a specific target contract in which several labels can apply to the same input. [[ml-decision-focused-learning|Decision-Focused Learning]] trains through downstream decision quality; reframing can change targets without an optimizer in training. [[ml-probability-calibration|Probability Calibration]] checks probability meaning after fitting. [[ml-conformal-prediction|Conformal Prediction]] adds sets under a stated coverage procedure; target bands alone provide no such guarantee. [[ml-class-rebalancing|Class Rebalancing]] changes influence during fitting rather than what the target means.

## Sources and further reading

- [Lakshmanan, Robinson, and Munn: Reframing notebook](https://github.com/GoogleCloudPlatform/ml-design-patterns/blob/master/03_problem_representation/reframing.ipynb) — the book’s output-representation pattern and implementation example.
- [Google: Framing an ML problem](https://developers.google.com/machine-learning/problem-framing/ml-framing) — target choice and application thresholds.
- [Scikit-learn: QuantileRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.QuantileRegressor.html) — conditional quantiles and pinball loss.
- [Scikit-learn: Metrics and scoring](https://scikit-learn.org/stable/modules/model_evaluation.html) — distinct regression, classification, and probability evaluation criteria.
