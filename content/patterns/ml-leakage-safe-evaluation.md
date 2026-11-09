---
id: ml-leakage-safe-evaluation
type: pattern
title: 'Leakage-Safe Evaluation'
summary: 'Design evaluation around the intended prediction setting, preventing unavailable information and related examples from crossing the relevant learning boundaries.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A model predicts which new customers will need onboarding help. Its offline score looks excellent, but performance drops when it meets customers absent from training. The evaluation had held out rows, while keeping other records from those same customers in the training set.

The score answered a different question: how well could the model recognize familiar customers? Leakage-Safe Evaluation makes the intended prediction setting explicit and protects the boundaries that make a performance claim credible.

## Core idea

Ask what information would be available when each prediction is made, and which examples should count as genuinely unseen. Then reproduce those conditions when developing and evaluating the model.

Leakage can enter through features, repeated entities, preprocessing, model selection, or repeated inspection of test results. A separate test file is not enough if information from it has already influenced the fitted system.

“Safe” is relative to a stated use. Predicting a known customer's next visit and predicting for a new customer require different evidence. Group and time boundaries may both matter.

## How it works

Define the prediction unit, forecast time, target horizon, intended population, and information available at that time. Identify related records: customers, devices, documents, duplicate images, or overlapping windows.

Choose splits that represent the claim. Hold out entire groups when evaluating unseen groups. Use forward-looking evaluation for future predictions, accounting for delayed features and labels. Ordinary row splitting can be appropriate when its independence assumptions and deployment setting are justified.

Treat the whole fitted pipeline as the model. Within each development fold, learn imputers, scalers, feature selection, encoders, and model parameters from that fold's training portion. Apply the resulting transformations to its validation portion.

Use validation data for choices such as hyperparameters, thresholds, and early stopping. Preserve a final evaluation set for the resulting procedure. [Nested cross-validation](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html) can separate tuning from outer evaluation when appropriate; it does not repair incorrect group or time boundaries.

## Worked examples

### Sixteen rows, but only eight customers

This fictional dataset contains customers A–H, each with two visits. Each customer's binary label is held constant across visits to isolate memorization. In A–H order, labels are **0, 1, 0, 1, 0, 1, 0, 1**.

The learner stores each training customer's majority label. For an unfamiliar ID, it predicts the overall training majority, breaking ties toward zero. It uses no transferable customer features.

| Evaluation design      | Training records   | Test records        | Customer IDs shared across sets | ID-lookup correctness |
| ---------------------- | ------------------ | ------------------- | ------------------------------: | --------------------: |
| Hold out second visits | First visit of A–H | Second visit of A–H |                               8 |            8/8 = 100% |
| Hold out customers E–H | Both visits of A–D | Both visits of E–H  |                               0 |             4/8 = 50% |

Both designs use eight training rows and eight test rows. Their training-majority baseline gets 4/8 correct in both cases. The difference comes from which customers are recognizable, not a larger training set.

![Two equal-sized evaluations test different generalization questions. Holding out second visits shares eight customer IDs and yields perfect memorization; holding out customers shares none and yields fifty percent correctness.](../assets/machine-learning/leakage-safe-evaluation.svg 'Both designs hold out eight rows, but only the customer split removes familiar identities. The lookup’s perfect visit score therefore supplies no evidence about unseen customers.')

For the new-customer claim, the first design fails to test the intended generalization. For a returning-customer claim, it may be appropriate if the first-visit labels really were available before the second visits. The grouped design isolates identity generalization; it does not also establish future-time performance.

The explorer actually creates both partitions, fits the lookup and baseline predictors, and scores their held-out rows. Change labels or which customer half is held out. Changing the stated prediction question changes the interpretation, not the calculated scores. Scikit-learn's documented [grouped cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html#group-k-fold) addresses this kind of entity separation.

```patternverse-widget
{
  "src": "ml-leakage-safe-evaluation.html",
  "title": "Leakage-safe evaluation split explorer",
  "height": 1200,
  "fallback": "Holding out visits gives 8/8 correct ID lookups; holding out whole customers gives 4/8. Both use eight training and eight test rows. The right interpretation depends on the deployment question."
}
```

### An event timestamp is not its availability time

In another fictional example, a prediction is issued at **09:00 on January 1**. Consider three possible inputs:

| Information       | Event time         | Available to the system | Usable at prediction time? |
| ----------------- | ------------------ | ----------------------- | -------------------------- |
| Last purchase     | December 31, 18:00 | December 31, 18:01      | Yes                        |
| Support complaint | January 1, 08:00   | January 1, 10:00        | No                         |
| Cancellation      | January 5          | January 5               | No                         |

The complaint happened earlier, but arrived too late. Joining historical features using event time alone can silently include it. [Feast's point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) illustrate historical feature retrieval; a real implementation must also represent relevant availability delays and backfills.

Suppose the label is cancellation by January 31, finalized on February 2. A model fitted on January 15 cannot legitimately use that completed label yet. Chronological row ordering alone does not solve this label-maturity problem.

[TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) provides ordered folds and a gap measured in samples. An appropriate exclusion interval must follow the actual forecast horizon, label windows, and data cadence; an arbitrary one-row gap is not a general safeguard.

### Preprocessing and selection also learn

Suppose training values are **[0, 2]** and a held-out value is **100**. Training-only centering learns mean **1**; centering after pooling all three learns **34**. The held-out input has influenced the transformation even without exposing its label. This does not imply that every such mistake increases every score.

Scikit-learn's [common-pitfalls guide](https://scikit-learn.org/stable/common_pitfalls.html) documents training-only preprocessing and pipelines. Pipelines help fit transformations inside cross-validation, but cannot remove a feature that already contains the answer.

### Optional: encoders that learn from labels

A target encoder replaces a category with a statistic of its labels. If a category appears once, its label mean equals that row’s own target. Training on that encoding can expose the answer directly. The documented [TargetEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.TargetEncoder.html) uses cross-fitting in `fit_transform`: it encodes each training portion using label statistics learned from other portions. Calling `fit` followed by `transform` behaves differently. Inner splits must also respect the relevant group and time contract.

## Assumptions for correctness

The evaluation must represent the deployment question, and timestamps must reflect the information actually accessible then. Entity identifiers and duplicate-family mappings must capture the dependencies that matter.

Keep evaluation labels out of fitting and model choices. In an explicitly transductive setting, using unlabeled evaluation inputs may be permitted by the task; describe that protocol rather than claiming wholly unseen inputs.

The explorer assumes stable within-customer labels and available first-visit labels. It models neither temporal drift nor noisy outcomes. Eight grouped test rows represent only four distinct customers, not eight independent entities.

## When to use it

Use this pattern whenever offline results support model selection or deployment claims. Grouped, temporal, and duplicate-rich datasets deserve particular attention, but even independent rows can suffer preprocessing or selection leakage.

Choose the split to match the use, rather than always selecting the design with the lowest score. Multiple intended uses can require multiple evaluations.

## Tradeoffs and operating costs

Group separation can reduce the number of independent training or evaluation units and increase score variability. Forward evaluation requires feature histories, label-availability tracking, and often repeated fits.

Version split assignments and data lineage alongside the model. Budget for representative evaluation labels and an untouched final check; repeatedly consulting that check turns it into development feedback.

## Common mistakes and limitations

Deduplicating only after splitting can leave related examples on both sides. Stratifying class proportions does not by itself separate entities or prevent future information. A pipeline or split class cannot certify the whole experiment.

Fixing leakage can lower a score without making a model worse. Conversely, a high or unchanged score does not prove the absence of leakage. [Kapoor and Narayanan](https://arxiv.org/abs/2207.07048) document leakage-related reproducibility failures; their findings motivate explicit information and evaluation protocols, not a universal numerical correction.

## Related patterns

[[ml-hyperparameter-tuning|Hyperparameter Tuning]] uses validation evidence to select configurations while preserving separate final evaluation. **Repeatable Splitting** makes partitions reproducible; Leakage-Safe Evaluation asks whether those partitions support the claim. [[ml-point-in-time-feature-retrieval|Point-in-Time Feature Retrieval]] enforces historical feature access. [[ml-slice-based-evaluation|Slice-Based Evaluation]] examines uneven performance within a valid evaluation. [[ml-label-preserving-augmentation|Label-Preserving Augmentation]] keeps descendants with their originals. [[ml-active-learning|Active Learning]] selects training labels, while representative evaluation remains a separate task.

## Sources and further reading

- [Scikit-learn: Common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) — preprocessing leakage and pipelines.
- [Scikit-learn: Grouped cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html#group-k-fold) — separating related entities.
- [Scikit-learn: TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) — ordered folds and sample-based gaps.
- [Feast: Point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) — historical feature retrieval.
- [Scikit-learn: TargetEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.TargetEncoder.html) — internal cross-fitting.
- [Scikit-learn: Nested versus non-nested cross-validation](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html) — evaluating a tuning procedure.
- [Kapoor and Narayanan: Leakage and the Reproducibility Crisis in ML-based Science](https://arxiv.org/abs/2207.07048) — methodological failure modes and reporting.
