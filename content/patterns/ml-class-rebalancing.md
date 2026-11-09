---
id: ml-class-rebalancing
type: pattern
title: 'Class Rebalancing'
summary: 'Change class influence during training through loss weights or sampling, then assess the fitted system on data that represents its intended use.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A factory labels 1,000 photographed parts: 900 ordinary and 100 defective. A classifier that calls every part ordinary reaches 90% accuracy while detecting no defects. The headline score hides the failure the factory cares about.

Class Rebalancing changes how strongly the classes influence training. It can help when the majority class dominates the fitted objective, but rarity alone does not establish that a model needs rebalancing. First inspect the errors and the consequences of missed defects and false alarms.

## Core idea

With **class weighting**, each training example's loss is multiplied by a weight determined by its label. Giving defective parts weight nine and ordinary parts weight one makes the 100 defects contribute as much total weight as the 900 ordinary parts.

**Resampling** changes which examples training sees, or how often it sees them. Oversampling repeats minority examples or constructs additional ones; undersampling retains fewer majority examples. These approaches change training influence. Repeating an observation does not provide another independent observation.

The intended change is to the learning objective, not the class proportions in the final evaluation set.

## How it works

Split data before estimating weights or resampling, respecting time, related entities, and duplicates. Within cross-validation, compute weights and fit samplers using each training fold only. Keep validation and final evaluation representative of the intended population, or explicitly account for their sampling design. Imbalanced-learn's [pitfalls guide](https://imbalanced-learn.org/stable/common_pitfalls.html) demonstrates why resampling before splitting produces misleading evaluation.

Establish an unweighted baseline. Choose an evaluation criterion tied to the task: defect recall, false-alarm workload, precision, or expected decision cost. Recall is the fraction of actual defects detected; precision is the fraction of flagged parts that are defective. Neither number alone describes the whole tradeoff.

Try class weights or a sampling strategy, fitting a new model for each setting. Select settings and decision thresholds on validation data, then assess the chosen system once on untouched data. A class ratio is a starting hypothesis, not a substitute for operational costs or validation evidence.

## Worked examples

### Equal class influence changes a fitted score

This computed example uses fictional training records grouped by a predefined input signal. The groups are features available before the outcome; their boundaries are not fitted from these labels.

| Input group   | Ordinary parts | Defective parts |
| ------------- | -------------: | --------------: |
| Low signal    |            810 |              10 |
| Middle signal |             81 |              20 |
| High signal   |              9 |              70 |

Fit a deliberately simple model with one constant score per group. Minimize binary log loss, which penalizes assigning a low probability to the observed label. With no regularization or shared parameters, each group's optimum is its weighted defect count divided by its total weighted count.

Without weights, the middle group's score is **20 / (81 + 20) ≈ 0.198**. With ordinary weight one and defect weight nine, it becomes **(9 × 20) / (81 + 9 × 20) = 180/261 ≈ 0.690**. The underlying group still contains only 20 defects among 101 parts. The larger score describes the changed objective, not a discovery that 69% of those parts are defective.

At a threshold of **0.5**, meaning flag scores at least 0.5, the unweighted model flags only the high group. It detects **70/100 = 70%** of defects and falsely flags nine ordinary parts. Precision is **70/(70 + 9) ≈ 88.6%**.

The weighted model flags the middle and high groups. Recall rises to **90/100 = 90%**, but false alarms rise to **81 + 9 = 90**. Precision falls to **90/(90 + 90) = 50%**. Accuracy falls from **961/1,000 = 96.1%** to **900/1,000 = 90%**. These are fitted training results on invented records, not measured factory performance.

![The same training records have a nine-to-one class count but equal total class weight. Weighting moves the middle group's fitted score across the decision threshold, adding detected defects and false alarms.](../assets/machine-learning/class-rebalancing.svg 'Compare record counts with training influence, then follow the middle group across the threshold. Reweighting changes fitted scores while leaving the observations fixed. More detected defects here come with more false alarms.')

The explorer fits all three group scores exactly, recomputes predictions on the original records, and compares the unweighted and weighted models. Weight changes refit scores; threshold changes affect decisions only. It also checks a repeated-record equivalent. No held-out outcomes are supplied.

```patternverse-widget
{
  "src": "ml-class-rebalancing.html",
  "title": "Class weights and fitted scores explorer",
  "height": 1200,
  "fallback": "On 1,000 invented training records, defect weight nine changes the middle-group score from 0.198 to 0.690. At threshold 0.5, recall rises from 70% to 90%, while false alarms rise from 9 to 90 and precision falls from 88.6% to 50%."
}
```

### Different routes to equal class contribution

Scikit-learn's documented [balanced class weights](https://scikit-learn.org/stable/modules/generated/sklearn.utils.class_weight.compute_class_weight.html) use **N / (K × n)**, where N is the training count, K the number of classes, and n the count of the particular class. Here the ordinary weight is **1,000/(2 × 900) = 5/9** and the defect weight is **1,000/(2 × 100) = 5**. Each class then contributes total weight 500. Their weight ratio is nine, matching the explorer.

Alternatively, retain all 900 ordinary records and include each defect exactly nine times: **900 + 9 × 100 = 1,800 row appearances**, but still only **1,000 unique records**. For this model's normalized, unregularized log-loss objective, uniform repetition and integer weighting give identical fitted scores. The explorer constructs those repetitions and verifies the equality.

This deterministic repetition differs from imbalanced-learn's documented [random oversampling](https://imbalanced-learn.org/stable/over_sampling.html), which samples with replacement and need not repeat every record equally. Its synthetic methods interpolate examples rather than making exact copies. [Random undersampling](https://imbalanced-learn.org/stable/references/generated/imblearn.under_sampling.RandomUnderSampler.html) could instead retain 100 ordinary records alongside 100 defects, reducing computation while discarding much majority-class coverage. These documented implementations do not validate the fictional factory model.

### Changing decisions without refitting

Keep the weighted scores but raise the threshold to **0.9**. Only the high group is flagged again, restoring the original error counts in this example. Scores have not changed. Scikit-learn's [threshold guide](https://scikit-learn.org/stable/modules/classification_threshold.html) distinguishes probability estimation from the decision made using a score.

Threshold adjustment is therefore an important comparison when ranking already works. Rebalancing need not improve ranking; here all three groups retain exactly the same order.

## Assumptions for correctness

Labels must be meaningful, and minority examples must cover relevant kinds of defects. Extra weight on mislabeled cases amplifies their influence. Sampling procedures must preserve valid examples and respect dependencies between observations.

Know how the learner normalizes weights and combines them with regularization. Multiplying every weight by a constant leaves this toy optimum unchanged, but can change a library model's effective regularization or optimization behavior. Weighting and sampling are not universally interchangeable.

## When to use it

Use rebalancing when important classes receive insufficient influence during fitting and validation shows that changing that influence improves the intended tradeoff. Compare against unweighted fitting with an adjusted decision threshold.

If rare cases are missing altogether, collect relevant examples. If errors reflect poor features or ambiguous labels, changing class counts may leave the central problem untouched.

## Tradeoffs and operating costs

Oversampling increases row appearances and can increase training time. Undersampling saves work but can remove useful majority examples. Weights avoid materializing copies, although very large weights can make fitting sensitive to a few records.

More detected minority cases can increase review workload. Plan capacity using representative predictions rather than a balanced training set. Preserve the sampling policy and weights alongside the fitted model for reproducibility.

## Common mistakes and limitations

Do not assume weighted-fit scores are calibrated deployment probabilities. Check probability meaning on suitable independent data; the [calibration guide](https://scikit-learn.org/stable/modules/calibration.html) explains how calibration connects scores to observed frequencies.

Balancing is not automatically the right cost policy. Multiclass problems may require different priorities, and class averages can conceal poor performance within a class. Synthetic samples can be unrealistic near class boundaries. Repeated records cannot justify treating the sample as larger when assessing uncertainty.

## Related patterns

[[ml-multilabel|Multilabel]] allows overlapping labels; rebalancing may then address each label’s unequal positive and negative evidence. [[ml-heuristic-benchmark|Heuristic Benchmark]] exposes misleading accuracy through simple comparisons. [[ml-probability-calibration|Probability Calibration]] addresses probability meaning after fitting. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects data boundaries around samplers and tuning. [[ml-worst-group-optimization|Worst-Group Optimization]] targets the largest specified group loss, rather than assigning fixed class weights. [[ml-label-preserving-augmentation|Label-Preserving Augmentation]] creates justified transformed views; repeating rare records alone supplies no new variation.

## Sources and further reading

- [Scikit-learn: compute_class_weight](https://scikit-learn.org/stable/modules/generated/sklearn.utils.class_weight.compute_class_weight.html) — the balanced-weight formula.
- [Imbalanced-learn: over-sampling](https://imbalanced-learn.org/stable/over_sampling.html) — random repetition, synthetic methods, and problematic examples.
- [Imbalanced-learn: RandomUnderSampler](https://imbalanced-learn.org/stable/references/generated/imblearn.under_sampling.RandomUnderSampler.html) — majority-class sampling.
- [Imbalanced-learn: common pitfalls](https://imbalanced-learn.org/stable/common_pitfalls.html) — split boundaries and realistic evaluation.
- [Scikit-learn: tuning the decision threshold](https://scikit-learn.org/stable/modules/classification_threshold.html) — fitting scores versus choosing actions.
- [Scikit-learn: probability calibration](https://scikit-learn.org/stable/modules/calibration.html) — independent calibration data and probability interpretation.
