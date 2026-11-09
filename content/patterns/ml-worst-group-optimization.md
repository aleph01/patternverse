---
id: ml-worst-group-optimization
type: pattern
title: 'Worst-Group Optimization'
summary: 'Train against the largest mean loss among specified groups so a strong aggregate result cannot simply outweigh a poorly served group.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A service desk predicts handling times accurately for routine requests, which dominate its training data. Requests arriving through an older intake channel are less common and consistently receive poor estimates. Reducing average error barely changes their experience: improvements on the larger group can outweigh continued failure on the smaller one.

Worst-Group Optimization makes the largest group loss part of the training objective. It asks the model to improve its weakest measured group, while making the cost to other groups and the overall result visible.

## Core idea

Define meaningful groups and compute a mean loss within each one. Instead of minimizing the loss averaged over all examples, minimize the largest group mean:

`minimize over θ: max_g L_g(θ)`

Here θ denotes model parameters and `L_g` is the average training loss for group g. This is the basic group distributionally robust optimization, or **group DRO**, objective studied by [Sagawa and colleagues](https://arxiv.org/abs/1911.08731).

Group size affects the reliability of its estimated loss, but does not automatically reduce its importance in this maximum. The “worst group” means the group with the highest chosen mean loss. It need not be the smallest group, and it is not the single worst example.

## How it works

Choose groups from the setting's failure modes: input channels, environments, or combinations such as class and background. Define a loss comparable across those groups. For each group, divide its total loss by its own example count; comparing unnormalized totals would confound performance with group size.

Training then adjusts parameters to reduce the maximum group loss. A practical approximation can maintain weights over groups, increase weight on groups with larger losses, and update the model using the weighted loss. The [authors' implementation](https://github.com/kohpangwei/group_DRO/blob/master/loss.py) contains this adaptive weighting approach. It differs from permanently giving every group equal weight.

Use group-aware validation for model selection and retain a final evaluation set. Low worst-group training loss alone is insufficient. Sagawa and colleagues found that overparameterized networks could fit all training groups while generalizing poorly on some; stronger regularization or early stopping mattered in their experiments.

For fixed group-conditional distributions, the maximum group mean also equals the largest average loss over arbitrary mixtures of those groups. This describes a particular robustness target. It does not cover every possible change within a group or an entirely unobserved population.

## Worked examples

### A shared handling-time estimate, fictional

To expose the objective, restrict the model to one prediction for everyone: `ŷ = 5 + θ` minutes. The data contains:

| Group              | Count | Observed handling times              |
| ------------------ | ----- | ------------------------------------ |
| A: routine channel | 90    | All 5 minutes                        |
| B: older channel   | 10    | Five at 6 minutes, five at 8 minutes |

This intentionally limited model cannot predict both B outcomes separately. With squared error, the group mean losses are `L_A = θ²` and `L_B = (θ − 2)² + 1`. For B, prediction errors are θ − 1 on six-minute records and θ − 3 on eight-minute records. Their mean squared error is **((θ − 1)² + (θ − 3)²)/2 = (θ − 2)² + 1**. The added one is B’s within-group variance for this constant predictor. It is not evidence that a richer model could never explain that variation.

Ordinary empirical risk minimization, or ERM, minimizes `0.9L_A + 0.1L_B`. Its solution is **θ = 0.20**, predicting **5.20 minutes**. Group losses are **0.04** and **4.24**, so sample-average MSE is **0.46**, while worst-group MSE is **4.24**. All MSE values here have units of minutes squared and come from the fictional training records.

Equal group weighting minimizes `(L_A + L_B)/2` and chooses **θ = 1**, predicting 6 minutes. Worst-group optimization instead equalizes these two losses at **θ = 1.25**, predicting **6.25 minutes**:

`1.25² = (1.25 − 2)² + 1 = 1.5625`

| Fit          | Prediction | Mean MSE | Worst MSE |
| ------------ | ---------- | -------- | --------- |
| Average loss | 5.20 min   | 0.4600   | 4.2400    |
| Equal groups | 6.00 min   | 1.1000   | 2.0000    |
| Worst group  | 6.25 min   | 1.5625   | 1.5625    |

The worst group improves while the sample average worsens. This is a real tradeoff in the stipulated model class, not a measured deployment improvement.

![Three fits to the same fictional handling-time records choose different shared corrections. Average loss chooses 0.20, equal group weighting chooses 1, and worst-group loss chooses 1.25. Group loss curves show why minimizing their upper envelope improves the worst loss while increasing sample-average loss.](../assets/machine-learning/worst-group-optimization.svg 'The selected point minimizes the upper loss curve. Compare its worst-group improvement with the increase in average loss. The three fits use the same fictional training data.')

```patternverse-widget
{
  "src": "ml-worst-group-optimization.html",
  "title": "Worst-group objective explorer",
  "height": 1200,
  "fallback": "A shared predictor fitted to average loss predicts 5.20 minutes; worst-group fitting predicts 6.25. The weakest group improves while average training error rises. Hypothetical mixture projections are not held-out results."
}
```

### When the worst losses do not meet

Increasing B’s spread changes the mechanism. If its times become 4 and 10 minutes, its variance becomes nine. The minimax solution is θ = 2, where B's MSE is nine and A's is four. Equalizing losses would do worse. Minimizing a maximum does not generally require equal final losses.

### A changed channel mix, fictional

Keep the original fitted models and group data, but suppose B represents 80% of future requests. Reweighting their existing group losses gives the ERM model a projected MSE of `0.2 × 0.04 + 0.8 × 4.24 = 3.40`. The minimax model stays at 1.5625 because its group losses match. This is a mixture calculation under unchanged group conditionals, not a test result. The explorer changes this projection without refitting the models.

### A verified research implementation

The [published group DRO repository](https://github.com/kohpangwei/group_DRO) includes Waterbirds experiments, where bird classes appear on land or water backgrounds and some combinations are uncommon in training. Group-aware validation and evaluation examine those combinations. These are documented research experiments, not production deployment evidence; this article has not rerun them. [WILDS](https://proceedings.mlr.press/v139/koh21a.html) provides a broader benchmark showing that distribution shifts remain challenging even for methods designed to address them.

## Assumptions for correctness

Groups must capture important failure conditions, have reliable labels, and contain enough examples to support useful estimates. A group absent from the data has no measured mean loss. Large groups can also hide poorly served intersections.

The training loss must reflect the intended goal. Reducing the largest squared error or cross-entropy does not automatically maximize worst-group accuracy, calibration, or downstream utility. Validation must represent the intended groups without becoming a repeatedly reused test set.

## When to use it

Use this pattern when unacceptable failures occur in identifiable groups and the application values improving the weakest group beyond its frequency in the training sample. It is useful for studying known spurious correlations or sensitivity to changing group proportions.

Begin with reliable slice evaluation. If failure comes from missing data, incorrect labels, or an unnecessarily restrictive model, improving those may be more effective than changing the objective alone.

## Tradeoffs and operating costs

Expect costs for group annotation, representative validation, group-aware batching, and monitoring both average and group results. Small groups produce noisy estimates; repeatedly emphasizing them can amplify mislabeled examples or overfit their training records.

The worst-group objective can spend substantial capacity on a high-loss group that remains difficult within the model class. Track the full group table rather than celebrating a single maximum. Our explorer solves a tiny convex problem exactly; neural-network optimization and population generalization are additional problems.

## Common mistakes and limitations

Equal group sampling is a useful baseline, but it does not generally solve the maximum-loss objective. Nor does group DRO guarantee robustness to unspecified groups or changes within known groups.

Do not treat the result as a general fairness certificate. [Hardt, Price, and Srebro](https://arxiv.org/abs/1610.02413) study criteria based on conditional prediction rates; these differ from minimizing the largest group mean loss. Selecting groups and a metric is a substantive design decision. Report uncertainty, data quality, relevant intersections, and average-performance costs alongside the worst-group result.

## Related patterns

[[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals group performance; this pattern changes the training objective. **Group-Balanced Reweighting** assigns fixed group weights rather than following the largest group loss. [Just Train Twice](https://proceedings.mlr.press/v139/liu21f.html) upweights examples identified by an initial model and avoids training-group annotations, while still using group-labeled validation. [[ml-decision-focused-learning|Decision-Focused Learning]] chooses an objective around downstream decisions rather than a maximum across group means.

## Sources and further reading

- [Sagawa et al.: Distributionally Robust Neural Networks for Group Shifts](https://arxiv.org/abs/1911.08731) — group DRO and regularization for worst-group generalization.
- [Authors' group DRO loss implementation](https://github.com/kohpangwei/group_DRO/blob/master/loss.py) — group means and adaptive group weights.
- [Authors' group DRO repository](https://github.com/kohpangwei/group_DRO) — Waterbirds construction, experiments, and evaluation setup.
- [Koh et al.: WILDS](https://proceedings.mlr.press/v139/koh21a.html) — distribution-shift benchmarks and limitations of existing methods.
- [Liu et al.: Just Train Twice](https://proceedings.mlr.press/v139/liu21f.html) — error-based upweighting and group-aware validation.
- [Hardt et al.: Equality of Opportunity in Supervised Learning](https://arxiv.org/abs/1610.02413) — fairness criteria distinct from mean-loss objectives.
