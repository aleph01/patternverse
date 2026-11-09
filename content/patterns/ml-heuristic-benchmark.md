---
id: ml-heuristic-benchmark
type: pattern
title: 'Heuristic Benchmark'
summary: 'Compare a learned system with a credible simple rule on the same task, data, and decision criteria before paying for added complexity.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A delivery-alert model gets 90% of its predictions right. That sounds promising, but a dispatcher asks two questions: what does the current rule achieve, and which mistakes does the model make? If the model misses expensive late deliveries while avoiding cheap false alerts, higher accuracy could still make it a worse choice.

Heuristic Benchmark establishes a credible simple alternative before interpreting a model's score. The purpose is to discover whether learning adds enough value to justify its costs, and to reveal problems that a headline metric can hide.

## Core idea

A **heuristic** is an explicit rule that provides an answer without learning a complex mapping: flag a delivery when its route falls behind, recommend popular items, or forecast next Monday from last Monday.

Run that rule and the candidate on the same eligible examples, with the same available information and evaluation criteria. The benchmark supplies a reference, not a universal target. A candidate can beat a deliberately weak rule while adding little beyond a stronger everyday alternative.

Keep a trivial reference too, such as always predicting one class. It exposes easy scores caused by an unbalanced dataset. Google's [Rules of ML](https://developers.google.com/machine-learning/guides/rules-of-ml) recommends beginning with heuristics and clear metrics before introducing complexity.

## How it works

First specify the decision: who needs a prediction, when it is made, and what outcome counts as correct. Choose a rule that a competent practitioner could reasonably use with information available then. Include the incumbent workflow when one exists; an invented toy rule should not replace the real operational comparison.

Freeze the rule, candidate, thresholds, and primary evaluation criteria before final testing. Estimate any constants from training data. Use development data to choose between rules or tune thresholds, then evaluate the chosen systems on untouched data. A simple baseline can overfit through repeated manual adjustment too.

Preserve paired results so differences can be traced to particular cases. Report the absolute scores, the change, and important error types. Inspect relevant slices and operating requirements alongside the primary metric. Google's [ML Test Score](https://research.google.com/pubs/archive/aad9f93b86b7addfea4c419b9100c6cdd26cacea.pdf) includes testing whether a simpler model performs better.

## Worked examples

### More correct predictions, more costly misses

Consider 20 fictional deliveries, four eventually late. Each prediction is made at 09:00 for a 10:00 delivery promise. “Minutes behind” measures progress against the route plan at 09:00; it is not the delivery's eventual lateness. Outcomes become available afterward.

The operational rule flags deliveries **more than 10 minutes behind**. The candidate flags scores **at least 0.50**. Its scores are invented, fixed ranking values, not calibrated probabilities or outputs from a model trained here. Six records contain all the late outcomes and false alerts relevant to the default comparison:

| Delivery | Minutes behind at 09:00 | Eventually late? | Candidate score |
| -------- | ----------------------: | ---------------- | --------------: |
| D01      |                      20 | Yes              |            0.90 |
| D02      |                      15 | Yes              |            0.80 |
| D03      |                      12 | Yes              |            0.45 |
| D04      |                       8 | Yes              |            0.35 |
| D05      |                      18 | No               |            0.40 |
| D06      |                      11 | No               |            0.30 |

The remaining 14 deliveries are on time, at most 10 minutes behind at prediction time, and have scores below 0.30.

An always-on-time policy, fixed in advance, gets **16/20 = 80%** correct but misses all four late deliveries. The rule catches three late deliveries, misses one, and raises two false alerts: **17/20 = 85%** correct. The candidate catches two, misses two, and raises no false alerts: **18/20 = 90%** correct.

Assign a missed late delivery five cost units and a false alert one. Correct decisions cost zero. These are illustrative penalties, not measured money or proven effects of alerting. The rule costs **1 × 5 + 2 × 1 = 7 units**; the candidate costs **2 × 5 + 0 × 1 = 10 units**. One additional correct answer conceals one additional costly miss.

![The rule gets seventeen deliveries right and costs seven assigned units. The candidate gets eighteen right but costs ten units because it misses two late deliveries instead of one.](../assets/machine-learning/heuristic-benchmark.svg 'Compare the missed deliveries before interpreting accuracy. Gray segments count false-alert cost; green segments count missed-delivery cost. Under the stated penalties, the more accurate candidate costs three units more on these same twenty records.')

The explorer recomputes predictions, error counts, and costs. At a missed-delivery penalty of two, both systems cost four units. Changing penalties changes evaluation, not predictions. Changing the candidate threshold changes predictions; the benchmark rule remains fixed. Trying thresholds on these displayed outcomes is exploration, so a resulting winner needs fresh evaluation.

```patternverse-widget
{
  "src": "ml-heuristic-benchmark.html",
  "title": "Heuristic benchmark comparison explorer",
  "height": 1200,
  "fallback": "On 20 fictional deliveries, the rule gets 17 right and the candidate 18. With five units per missed late delivery and one per false alert, their costs are 7 and 10. Compare error types before choosing a winner."
}
```

### A seasonal reference changes the forecasting comparison

A fictional pickup service operates Monday through Thursday. Last week's daily orders were **100, 120, 110, 130**. Before the next week begins, a seasonal rule repeats the corresponding weekday's count. A candidate supplies fixed forecasts **106, 122, 112, 128**. Actual orders later arrive as **105, 118, 115, 126**.

**Mean absolute error (MAE)** averages the size of errors, ignoring their sign. The seasonal rule's errors are 5, 2, 5, and 4 orders, giving **16/4 = 4 orders**. The candidate's errors are 1, 4, 3, and 2, giving **10/4 = 2.5 orders**.

A constant forecast of 115, the previous week's mean, has MAE **(10 + 3 + 0 + 11)/4 = 6 orders**. The candidate improves on both references in this constructed week, but its advantage over the seasonal rule is smaller. Four outcomes establish neither stable superiority nor uncertainty bounds.

[Forecasting: Principles and Practice](https://otexts.com/fpp3/toolbox.html#some-simple-forecasting-methods) documents seasonal-naïve methods and executable forecasting examples. These four numbers are fictional, not results reproduced from that book.

### Documented baseline implementations

Scikit-learn's [DummyClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.dummy.DummyClassifier.html) can predict the most frequent **training** class regardless of input features. [DummyRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.dummy.DummyRegressor.html) offers training-mean, median, quantile, and fixed-value strategies. These implement useful reference policies; they do not choose the right business objective or replace a domain-specific rule. Neither library is executed by this page's explorer.

## Assumptions for correctness

Both systems must answer the same question using information legitimately available at prediction time. Apply the same inclusion rules, label definitions, and treatment of missing or failed predictions. Otherwise, an apparent gain can come from comparing different populations.

The evaluation sample must support the intended deployment claim. Reliable labels, appropriate time or entity separation, and an analysis respecting dependence matter for simple rules as well as learned models. Cost comparisons additionally assume that the stated penalties reasonably describe the decision being assessed.

## When to use it

Use this pattern before substantial model development, when reviewing a replacement, or when deciding whether an existing model still earns its maintenance. It is especially revealing when common outcomes make raw accuracy easy to achieve, or when seasonality supplies a strong forecast reference.

Retain the benchmark after launch so future changes face the same comparison, updating its definition deliberately when the task changes.

## Tradeoffs and operating costs

A credible rule requires domain input, implementation, and maintenance. Matching data paths and measuring paired outcomes take work. Simple rules may also rely on expensive features or manual decisions, so simplicity does not automatically mean cheaper operation.

Compare practical costs separately: latency, infrastructure, annotation, monitoring, and human review. The delivery explorer counts assigned error penalties only; it measures none of these operating costs.

## Common mistakes and limitations

Do not choose the weakest available reference, tune on final outcomes, or compare a candidate's best run with an outdated rule on different data. Small observed differences require uncertainty analysis suited to the metric and sampling design before claims of reliable improvement.

A strong heuristic can encode unfair treatment or exploit biased labels. Beating it does not establish fairness, safety, calibration, or causal business benefit. An alert can change what happens next, so historical prediction errors alone do not estimate the effect of acting on it.

## Related patterns

[[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects the information boundary of the comparison. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks whether a gain hides local regressions. [[ml-decision-focused-learning|Decision-Focused Learning]] changes the training objective to reflect downstream decisions; this pattern can assess decision costs without changing training. [[ml-shadow-deployment|Shadow Deployment]] gathers serving evidence alongside an incumbent, but cannot by itself establish the effects of replacing it.

## Sources and further reading

- [Google: Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml) — heuristics, metrics, and the costs of complexity.
- [Breck and colleagues: The ML Test Score](https://research.google.com/pubs/archive/aad9f93b86b7addfea4c419b9100c6cdd26cacea.pdf) — simpler-model comparisons and production-readiness checks.
- [Scikit-learn: DummyClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.dummy.DummyClassifier.html) — constant and training-frequency classification references.
- [Scikit-learn: DummyRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.dummy.DummyRegressor.html) — simple regression references estimated from training targets.
- [Hyndman and Athanasopoulos: simple forecasting methods](https://otexts.com/fpp3/toolbox.html#some-simple-forecasting-methods) — mean, naïve, and seasonal-naïve benchmarks.
