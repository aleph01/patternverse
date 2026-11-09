---
id: ml-slice-based-evaluation
type: pattern
title: 'Slice-Based Evaluation'
summary: 'Evaluate the same predictions on meaningful subsets, retaining sample sizes and uncertainty so aggregate improvements do not conceal local failures.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support-ticket classifier improves from 80% to 85% accuracy. The team considers replacing the current model, until someone checks desktop users: their accuracy has fallen. Improvements elsewhere outweighed that regression in the overall score.

Slice-Based Evaluation makes such differences visible. Its purpose is to assess performance for meaningful conditions and populations, alongside the aggregate result, before deciding whether a model meets its requirements.

## Core idea

A **slice** is a subset defined by an explicit condition: device is mobile, language is Spanish, or both. Apply the same metric to predictions and labels within each selected subset. Keep the condition, numerator, denominator, and relevant uncertainty together.

Slices can partition a dataset, overlap, or describe intersections. The same case may belong to several reports. A dashboard with many rows therefore does not necessarily contain many independent observations.

Slicing reveals where performance differs. It does not establish why it differs, whether the model caused a harm, or which intervention will help.

## How it works

Begin with an evaluation set appropriate to the intended use. Define important slices from product requirements, domain knowledge, incidents, and affected users' concerns. Include conditions the aggregate could underrepresent, such as older devices or low-quality inputs.

Preserve labels, predictions, stable example identifiers, and slicing attributes. For a model comparison, evaluate both candidates on the same examples with the same label definition, metric, and decision policy. Otherwise, changes in data composition can be mistaken for model improvements.

Calculate counts and metrics for the whole set and each slice. A slice with no examples has no measured performance. A metric may also be undefined despite having rows: positive-class recall has no denominator when a slice contains no positive labels.

Separate planned checks from exploratory discovery. Inspect error examples and label quality, then confirm promising findings on fresh evidence before making strong claims. Freeze development choices before a final evaluation. [TensorFlow Model Analysis](https://www.tensorflow.org/tfx/model_analysis/setup) documents model comparisons and slicing by feature values and crossed features.

## Worked examples

### An aggregate improvement with a local regression

Consider 20 fictional tickets, one per customer, with verified binary labels and two stored sets of predicted labels. A is the current model and B the candidate. No models are trained in this example.

| Evaluation set | Rows |     A correct |      B correct |
| -------------- | ---: | ------------: | -------------: |
| All tickets    |   20 |   16/20 = 80% |    17/20 = 85% |
| Desktop        |   16 | 14/16 = 87.5% | 13/16 = 81.25% |
| Mobile         |    4 |     2/4 = 50% |     4/4 = 100% |
| Tablet         |    0 |  Not measured |   Not measured |

The overall gain is one additional correct ticket. Desktop loses one correct prediction, while mobile gains two. These are descriptive results on the same cases, not evidence that either change will persist in deployment.

![The same twenty tickets show overall accuracy improving from eighty to eighty-five percent while desktop accuracy declines. Mobile improves on four cases, and tablet has no evidence.](../assets/machine-learning/slice-based-evaluation.svg 'The overall gain combines two additional correct mobile cases with one fewer correct desktop case. Tablet has no observations. Counts distinguish a local result from missing evidence.')

The explorer recomputes counts, confusion matrices, accuracy, recall, and illustrative confidence intervals from the fixed records. Changing the slicing view changes what is displayed, not the predictions or overall metric. A minimum-row filter can simplify the display, but hidden slices remain unresolved.

```patternverse-widget
{
  "src": "ml-slice-based-evaluation.html",
  "title": "Slice-based evaluation comparison explorer",
  "height": 1200,
  "fallback": "On the same 20 cases, overall correctness rises from 16 to 17 while desktop correctness falls from 14 to 13. Mobile has four cases; tablet has none. Filters change the display only."
}
```

### Intersections expose different evidence

The data contain 12 desktop–English tickets, four desktop–Spanish, three mobile–English, and one mobile–Spanish. A gets **11/12, 3/4, 2/3, and 0/1** correct; B gets **10/12, 3/4, 3/3, and 1/1**.

The Spanish slice contains five tickets; mobile contains four. Their intersection contains one. Adding those two slice counts gives nine memberships across only eight distinct tickets. Counting their shared ticket twice does not create another observation. [Fairlearn's intersecting-groups guide](https://fairlearn.org/v0.13/user_guide/assessment/intersecting_groups.html) supports crossed groups and emphasizes counts, including small and empty intersections.

B's 1/1 on mobile–Spanish is 100%, but very little evidence. Under an independent-binomial sampling assumption, a nominal 95% Wilson interval with z = 1.96 is approximately **20.7%–100%**. The [NIST handbook](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) describes this interval method. Here it illustrates uncertainty; synthetic records do not support a real population claim.

These are separate intervals for each model's rate. They are not an interval for the paired improvement, simultaneous guarantees across searched slices, or a significance test. Correlated visits would require an analysis that respects customer-level dependence.

### The metric and population mix change the question

Suppose the positive label means a ticket requires escalation. A finds **7/10** positive tickets and B **8/10**, giving recall of **70%** and **80%**. Desktop recall is **6/8 = 75%** for both, despite its accuracy regression. Accuracy includes negative cases; recall asks only how many actual positives were found.

If missed escalations are especially costly, accuracy alone is insufficient. Precision, false-positive rates, calibration, and operational costs may also matter. [Fairlearn's metric guide](https://fairlearn.org/v0.13/user_guide/assessment/common_fairness_metrics.html) explains that metric choices carry different assumptions; comparing accuracy across groups does not constitute a complete fairness assessment.

Composition matters too. The observed device split is 80% desktop and 20% mobile. An unweighted average of A's two device accuracies is **68.75%**, not its overall 80%. That average assigns equal weight to devices, rather than tickets. If conditional rates held under a hypothetical 50:50 deployment mix, that same arithmetic would describe the reweighted estimate. It would not supply evidence for missing tablet cases.

## Assumptions for correctness

Slice attributes and labels must be reliable and interpreted consistently. Missing metadata needs an explicit category or documented treatment; silently dropping it changes the evaluated population.

Use only attributes that are appropriate to collect and analyze. Audit attributes need not be model inputs, but their availability and access still matter. Uncertainty calculations must match the sampling unit and dependence structure, and the evaluation sample must support the population being discussed.

## When to use it

Use slicing when a model serves varied populations or operating conditions, when replacing a model, or when investigating an incident hidden by aggregate metrics. Select slices that reflect meaningful requirements rather than only those convenient to query.

It is especially useful alongside error inspection: a weak language slice might suggest translation, labeling, input-quality, or coverage problems. The metric alone cannot distinguish them.

## Tradeoffs and operating costs

Costs include obtaining labels and metadata, maintaining stable slice definitions, computing comparisons, and collecting more evidence for sparse groups. Intersections grow quickly as dimensions multiply.

Prioritize important planned slices, retain an exploratory path, and record support thresholds. A single universal minimum count cannot guarantee enough evidence for every metric, effect size, or consequence. Fairlearn also documents [bootstrap uncertainty estimation](https://fairlearn.org/v0.13/user_guide/assessment/confidence_interval_estimation.html); resampling does not repair an unrepresentative sample.

## Common mistakes and limitations

Averaging overlapping slices or slice-level F1 scores generally does not recover the overall metric. Calculate the intended aggregate directly from records, or use a valid aggregation rule with explicit weights and sufficient statistics.

Searching many slices and highlighting only the worst invites chance findings. Confirm discoveries independently and account for multiple comparisons when making inferential claims. Do not interpret an exploratory minimum as a proven population failure rate.

Neither equal scores nor narrow intervals establish fairness or absence of harm. Slicing can miss unrecorded conditions and biased labels. Raising a support filter may hide an important underserved group rather than resolve its uncertainty.

## Related patterns

[[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] establishes valid information and splitting boundaries before slicing. [[ml-behavioral-testing|Behavioral Testing]] checks specific expected behaviors, often with constructed examples. **Data Drift Detection** examines changing inputs or outputs; labeled slices measure observed performance. [[ml-probability-calibration|Probability Calibration]] checks the meaning of predictive scores, which can also vary by slice.

## Sources and further reading

- [TensorFlow Model Analysis: setup](https://www.tensorflow.org/tfx/model_analysis/setup) — model, metric, and slicing specifications.
- [Fairlearn: intersecting groups](https://fairlearn.org/v0.13/user_guide/assessment/intersecting_groups.html) — intersections, counts, and empty groups.
- [NIST: confidence intervals for proportions](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) — Wilson intervals and binomial assumptions.
- [Fairlearn: common fairness metrics](https://fairlearn.org/v0.13/user_guide/assessment/common_fairness_metrics.html) — metric definitions and interpretation limits.
- [Fairlearn: confidence interval estimation](https://fairlearn.org/v0.13/user_guide/assessment/confidence_interval_estimation.html) — bootstrap estimates and representativeness limitations.
