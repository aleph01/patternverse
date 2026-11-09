---
id: ml-continuous-model-evaluation
type: pattern
title: 'Continuous Model Evaluation'
summary: 'Repeatedly join deployed predictions to eligible outcomes, report performance with label coverage and cohort context, and route findings to an explicit response policy.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A ticket-routing model passed its release tests. A month later, its dashboard reports fewer mistakes. The apparent improvement is reassuring until an analyst notices that difficult tickets take longer to review. The newest score describes the easy cases whose labels arrived first.

Continuous Model Evaluation repeatedly checks deployed predictions against suitable outcomes. It asks how the system is performing now, while keeping visible which predictions can actually be assessed. Successful requests, stable inputs, and a low observed error rate answer different questions.

## Core idea

Treat evaluation as a recurring **prediction-to-outcome join**, followed by measurement and a response decision. Preserve the prediction made at the time, its release identity, and the eventual label. Recomputing today's model on yesterday's inputs evaluates a different system.

Group results by a meaningful **prediction cohort**, such as requests made on the same day under the same release. Record both prediction time and label availability time. Late labels should update their original cohort rather than silently becoming evidence about today's traffic.

Report denominators alongside performance. An error rate among labeled cases does not describe unlabeled cases unless additional assumptions justify that inference.

## How it works

Log a stable request identifier, prediction, prediction timestamp, model and transform versions, and relevant slice attributes. Associate outcome records by identity and target definition. Resolve retries, duplicate records, and label corrections through explicit rules rather than counting whichever rows happen to join.

Choose evaluation windows and an outcome-eligibility policy. Some targets require a fixed observation horizon; others depend on reviews with variable delay. Track eligible predictions, matched labels, unmatched records, label age, and failures in the evaluation pipeline itself.

Compute task metrics for releases and important slices, using comparable populations and label policies. [TensorFlow Model Analysis](https://www.tensorflow.org/tfx/model_analysis/get_started) documents metric and slice evaluation. Scheduling runs, acquiring labels, and deciding what to do with findings are additional responsibilities.

Define response rules before examining the newest result. These can request investigation, additional labeling, a release hold, or escalation. They need not retrain or replace a model automatically. [TFMA's validation documentation](https://www.tensorflow.org/tfx/model_analysis/model_validations) supports configured metric bounds and changes relative to a baseline; the appropriateness of the bounds remains an application decision.

## Worked examples

### The newest cohort looks better before its labels arrive

These fictional ticket predictions use the same fixed model M1 and transform T1. Categories are 0 and 1. Each cohort contains two routine tickets and four complex tickets. “Day” denotes an integer UTC day boundary. Evaluation waits until a cohort is at least two days old, a teaching policy that does not guarantee complete labels.

| Cohort | Eligible from | Day 5 labels | Errors |
| ------ | ------------- | -----------: | -----: |
| Day 1  | Day 3         |            6 |      1 |
| Day 3  | Day 5         |            2 |      0 |

At the Day 5 checkpoint, the older cohort has **1/6 ≈ 16.7% error**. The newer cohort has **0/2 = 0% observed error**, but only **2/6 ≈ 33.3% label coverage**. Coverage is matched usable labels divided by eligible predictions. The other four labels are missing, not correct predictions.

The explorer's illustrative evidence policy requires four labels before treating an error-limit breach as an investigation signal. With sufficient count, observed error above 25% triggers investigation. Otherwise, reporting “no configured breach” also requires at least 80% coverage. Fewer labels, insufficient coverage, or an ineligible cohort receive an explicit waiting status. These settings are mechanical teaching rules, not confidence guarantees or production recommendations.

![Two prediction cohorts retain their original dates while labels arrive later. At the Day 5 checkpoint, the older cohort has six usable labels and one error; the newer has two usable labels, zero observed errors, and four unknown outcomes.](../assets/machine-learning/continuous-model-evaluation.svg 'Compare label coverage before comparing error rates. Green cells represent usable joined labels; question marks remain outside the error denominator. A zero observed error rate can coexist with too little evidence to clear the newer cohort.')

At Day 6, two more labels join the newer cohort. Both reveal errors, so its observed rate becomes **2/4 = 50%**, with **4/6 ≈ 66.7% coverage**. The count rule now requests investigation while the coverage gap remains visible. At Day 7, another error arrives: **3/5 = 60%**, with **5/6 ≈ 83.3% coverage**. One outcome never arrives in the delayed-label scenario.

The explorer joins records by ID at each selected checkpoint and computes every count and policy result. An alternate timing scenario makes all fixture labels available at the minimum age. It changes availability, not predictions or outcomes. It is a synthetic comparison, not a method for recovering real missing labels.

```patternverse-widget
{
  "src": "ml-continuous-model-evaluation.html",
  "title": "Delayed labels and cohort evaluation explorer",
  "height": 1200,
  "fallback": "At Day 5, the older fictional cohort has one error among six labels. The newer cohort has zero errors among only two labels, covering one third of its eligible predictions. By Day 7 its observed error becomes three of five. Missing labels are never counted as correct."
}
```

### Overall coverage hides which cases are absent

At Day 5, both routine tickets in the newer cohort have usable labels: **2/2 = 100% coverage**. None of its four complex tickets does: **0/4 = 0% coverage**. The observed zero-error result therefore says nothing about complex-ticket quality.

Filtering to a slice must change both numerator and denominator. The complex slice has no measurable error rate yet; displaying zero would invent evidence. Even reaching 80% overall coverage later cannot establish representative missingness. In the alternate fully labeled fixture, the newer cohort has **4/6 ≈ 66.7% error**, compared with the delayed scenario's Day 7 rate of 60%. The missing sixth outcome was also an error in this constructed example.

A documented implementation illustrates the join boundary: [SageMaker's ground-truth workflow](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-merge.html) matches captured predictions and labels using unique identifiers, with label collection dates distinct from inference dates. Its [model-quality overview](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality.html) describes recurring quality jobs. AWS currently restricts Model Monitor to existing customers; these references document the mechanism rather than recommend a new service enrollment.

### A longer outcome horizon changes eligibility

Suppose another fictional system predicts whether a purchase will be returned within 30 days. At age ten days, “no return recorded” is not a completed negative label: the customer still has twenty days to return it. Counting every unreturned purchase as a negative would systematically change the target.

Evaluate completed observation windows or use an explicitly designed method for incomplete follow-up. Even after day 30, ingestion delays and return-record completeness require checks. A fixed waiting period and complete, trustworthy ground truth are separate conditions.

## Assumptions for correctness

Predictions and labels must refer to the same entity, event, target horizon, and release. Label corrections need auditable revision rules. Missing outcomes may depend on difficulty, model decisions, or user behavior; coverage alone does not remove selection bias.

Comparisons need suitable population context. A metric can change because the traffic mix changed, the label process changed, or the model changed. Continuous evaluation observes these results; it does not by itself identify their cause.

## When to use it

Use this pattern for deployed models whose inputs, users, outcomes, or operating conditions evolve. It is particularly useful when labels arrive after prediction or only for a subset of decisions.

If ground truth cannot be obtained, monitor operational and input signals while naming the quality question that remains unanswered. A drift detector is not automatically an accuracy evaluator.

## Tradeoffs and operating costs

Recurring joins, retained prediction records, labeling, slice analysis, and investigation consume resources. Late corrections require recomputation and versioned reports. Retention must support the evaluation horizon without keeping unnecessary sensitive data.

Frequent checks and many slices can produce noisy alerts. Minimum counts alone do not establish statistical power. Plan uncertainty handling, alert ownership, and follow-up capacity alongside thresholds.

## Common mistakes and limitations

Do not group solely by label-arrival date, mix releases indiscriminately, treat missing telemetry as success, or train repeatedly against the same monitoring labels and still call them independent evaluation.

Good observed performance does not establish business impact. A routing decision can influence which ticket receives review; recommendation outcomes reflect what was shown. Feedback and selective observation can persist even when the join is technically correct. The explorer models no causal effect, statistical test, live traffic, or automatic retraining.

## Related patterns

[[ml-drift-detection|Drift Detection]] compares data distributions; outcome evaluation separately checks whether predictions remain useful. [[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals subgroup results within each recurring evaluation. [[ml-shadow-deployment|Shadow Deployment]] observes a candidate without serving its answers. [[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] uses evidence to govern limited releases. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] checks feature production across paths. [[ml-model-cards|Model Cards]] can carry dated evaluation evidence and known gaps with a release.

## Sources and further reading

- [TensorFlow Model Analysis: getting started](https://www.tensorflow.org/tfx/model_analysis/get_started) — model evaluation and slices.
- [TensorFlow Model Analysis: model validations](https://www.tensorflow.org/tfx/model_analysis/model_validations) — metric thresholds and baseline comparisons.
- [Amazon SageMaker AI: ground-truth joins](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-merge.html) — identity matching and distinct collection times.
- [Amazon SageMaker AI: model quality](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality.html) — recurring prediction/outcome evaluation and current service availability.
