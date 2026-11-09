---
id: ml-decision-focused-learning
type: pattern
title: 'Decision-Focused Learning'
summary: 'Train predictions for the quality of the constrained decisions they induce, while keeping the objective, feasible actions, and evaluation assumptions explicit.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A maintenance team predicts the benefit of several repair jobs, then chooses which jobs fit this week's capacity. Its new predictor has lower average error, yet the resulting schedule delivers less benefit. The mistakes that changed the chosen schedule mattered more than errors on jobs that would never be selected.

Decision-Focused Learning makes that downstream decision part of model training. It asks whether predictions lead to useful actions under the actual objective and constraints, rather than assuming that a better prediction score guarantees a better operation.

## Core idea

Treat prediction, optimization, and outcome evaluation as one pipeline. The predictor estimates unknown quantities; a decision rule uses those estimates to choose a feasible action; the training loss reflects the resulting action's quality.

For benefit maximization, **regret = best feasible true benefit − true benefit of the chosen action**. Predictions choose the action, but true outcomes score it. For cost minimization, reverse the subtraction. This hindsight reference may use information unavailable when acting; zero regret is not always attainable under uncertainty.

This is a training principle, not merely a dashboard metric. Measuring regret after training a model on mean squared error is decision evaluation. Changing how the model is fitted in response to decision quality makes the learning decision-focused.

## How it works

Specify the feasible actions and operational objective first. For each training instance, predict its uncertain parameters, solve the decision problem using those predictions, and evaluate the selected action using observed outcomes or a justified outcome model.

Train the predictor to reduce this decision loss, or a suitable surrogate. Keep a conventional predictor feeding the same optimizer as a baseline. The comparison should isolate the effect of the learning objective rather than silently giving one method a better decision rule.

The difficult step is learning through the optimizer. Discrete decisions can remain unchanged across many prediction values, then jump at a boundary. Their direct gradients may be zero or undefined. [Wilder, Dilkina, and Tambe](https://ojs.aaai.org/index.php/AAAI/article/view/3982) use continuous relaxations; [Smart “Predict, then Optimize”](https://arxiv.org/abs/1710.08005) develops the SPO+ surrogate. These are specific approaches with assumptions, not a universal differentiation trick.

Train on multiple instances, choose settings using validation decisions, and evaluate on independent cases. Record prediction error, decision quality, feasibility, and computational cost separately.

## Worked examples

### Lower error, worse maintenance schedule

The following jobs and benefit points are fictional. Each job is either selected completely or omitted; benefits add, and the capacity budget is four units.

| Job | Capacity required | True benefit |
| --- | ----------------: | -----------: |
| A   |                 2 |            6 |
| B   |                 2 |            5 |
| C   |                 3 |           10 |

The feasible subsets are empty, A, B, C, and A + B. The true best decision is A + B, worth 11.

To expose a learning tradeoff, restrict the predictor to **[5.5 + θ, 4.5 + θ, 10.5 + 1.5θ]**, with θ chosen from 0, 0.1, …, 2.0. Here θ is one shared adjustment to three predictions; the third prediction changes 1.5 times as much. This limited family cannot reproduce all true benefits.

Fit the same 21 candidates using two objectives:

| Fitting objective       | Selected θ | Predicted benefits A, B, C | Prediction MSE | Chosen jobs | True benefit | Regret |
| ----------------------- | ---------: | -------------------------- | -------------: | ----------- | -----------: | -----: |
| Minimum MSE             |        0.1 | 5.6, 4.6, 10.65            |         0.2475 | C           |           10 |      1 |
| Minimum decision regret |        1.1 | 6.6, 5.6, 12.15            |         1.7808 | A + B       |           11 |      0 |

For θ = 0.1, MSE is **((5.6 − 6)² + (4.6 − 5)² + (10.65 − 10)²)/3 = 0.2475**. Predicted A + B gives 10.2, below C’s 10.65, so the optimizer chooses C. At θ = 1.1, A + B gives 12.2, above C’s 12.15. That fit has worse numerical predictions but ranks the schedules correctly. Its scores should not automatically be reused as calibrated benefit forecasts for another purpose.

![The same limited predictor is fitted using prediction error or decision regret. The lower-error fit selects job C for true benefit 10; the decision-focused fit selects A and B for benefit 11.](../assets/machine-learning/decision-focused-learning.svg 'Compare the chosen schedules, not just prediction MSE. The decision-focused fit sacrifices numerical accuracy to select A + B, worth 11 rather than 10 in this fictional training instance.')

Ties matter. The optimizer prefers fewer jobs when predicted benefits tie, then alphabetical subset order. At θ = 1, C and A + B both score 12, so it selects C. At 1.1, A + B scores 12.2 and wins. Among equally good parameter candidates, fitting chooses the smaller θ.

The explorer actually fits both objectives by exhaustive search. Changing capacity or observed benefits recomputes the feasible actions, candidate fits, and regret. It learns one parameter on one case; it does not train a neural network or demonstrate generalization.

```patternverse-widget
{
  "src": "ml-decision-focused-learning.html",
  "title": "Decision-focused fitting and regret explorer",
  "height": 1200,
  "fallback": "With capacity four, prediction-error fitting selects job C for true benefit 10. Decision-regret fitting selects A + B for 11. Both fit the same limited predictor to one fictional training case."
}
```

### Inventory with unequal mistakes

In another fictional setting, demand is either 2 or 8 units, each with probability one-half. An unsold unit costs one point; an unmet unit costs five. Ordering the mean demand, 5, has expected cost **(3 + 15)/2 = 9**. Ordering 8 costs **(6 + 0)/2 = 3**; ordering 2 costs **(0 + 30)/2 = 15**.

The best order reflects asymmetric consequences, not closeness to the mean. This does not establish that decision-focused training is necessary: a conventional model estimating the correct demand distribution, followed by the correct inventory optimizer, also chooses 8. It is an essential baseline.

### Documented approaches

[Donti, Amos, and Kolter](https://proceedings.neurips.cc/paper/2017/hash/3fc2c60b5782f641f76bcefc39fb2392-Abstract.html) study task-based model learning for inventory, electrical-grid scheduling, and energy-storage decisions. These are specific experimental applications, not evidence of universal gains.

[PyEPO](https://khalil-research.github.io/PyEPO/) provides predict-then-optimize tooling, including a knapsack example with SPO+ training and separate decision evaluation. The explorer here uses exact enumeration instead, so it reproduces neither that training algorithm nor a published benchmark.

## Assumptions for correctness

The modeled objective and constraints must reflect the actual decision. Optimizing an incomplete objective can improve its score while worsening omitted service, safety, or distributional requirements.

Evaluating an unchosen action requires information about its outcome. Historical logs containing only selected jobs do not automatically reveal every alternative's benefit. Full outcome labels, a justified simulator, or appropriate causal/off-policy methods may be needed. Decision-focused loss does not supply missing counterfactuals.

The example assumes known capacity costs, additive benefits, complete outcome information, and an exact solver. Real solvers may return approximate or time-limited solutions; measure the quality and feasibility of what they actually return.

## When to use it

Consider this pattern when predictions feed an explicit decision problem and different errors have different operational effects. Scheduling, resource allocation, routing, and inventory can have this structure.

If a strong conventional predictor already induces good decisions, the added training machinery may not repay its cost. Stable, accurate distribution estimates can be sufficient for a well-designed stochastic optimizer.

## Tradeoffs and operating costs

Training can require repeated optimization solves, relaxations, or solution caches. Solver runtime, numerical behavior, and validation expense become part of model development. The tiny explorer avoids these scaling problems by examining eight possible subsets.

Changing constraints can change which prediction errors matter. Revalidate after capacity, costs, or service rules change. Retain prediction diagnostics as well as decision metrics; task-specific scores may be poor inputs to unrelated decisions.

## Common mistakes and limitations

Reporting training regret as a deployment gain hides overfitting. Zero regret on one instance does not establish reliable decisions on future instances. A normalized regret ratio can also be unstable when the reference objective is near zero; state its definition and report meaningful absolute units.

Ignoring optimizer ties can change measured regret. [PyEPO's evaluation documentation](https://khalil-research.github.io/PyEPO/content/getting_started/evaluation.html) distinguishes the returned solution's regret from worst-case regret across tied optima. The explorer exposes its deterministic tie rule.

## Related patterns

[[ml-reframing|Reframing]] changes the learning target or output without necessarily training through an optimizer. **Cost-Sensitive Learning** weights prediction mistakes; Decision-Focused Learning accounts for their effect on a downstream decision, including coupled constraints. **Learning to Rank** can preserve the ordering of feasible solutions, as studied by Mandi and colleagues. **Reinforcement Learning** additionally addresses sequential interaction and feedback. [[ml-off-policy-evaluation|Off-Policy Evaluation]] concerns evaluating actions from logged behavior. **Robust Optimization** protects against specified uncertainty rather than relying solely on fitted decision scores.

## Sources and further reading

- [Elmachtoub and Grigas: Smart “Predict, then Optimize”](https://arxiv.org/abs/1710.08005) — decision loss and the SPO+ surrogate.
- [Wilder, Dilkina, and Tambe: Melding the Data-Decisions Pipeline](https://ojs.aaai.org/index.php/AAAI/article/view/3982) — integrating combinatorial optimization with learning.
- [Donti, Amos, and Kolter: Task-based End-to-end Model Learning in Stochastic Optimization](https://proceedings.neurips.cc/paper/2017/hash/3fc2c60b5782f641f76bcefc39fb2392-Abstract.html) — task-based probabilistic model learning.
- [Mandi and colleagues: Decision-Focused Learning: Through the Lens of Learning to Rank](https://proceedings.mlr.press/v162/mandi22a.html) — ranking feasible solutions.
- [PyEPO documentation](https://khalil-research.github.io/PyEPO/) — implementations and the knapsack workflow.
- [PyEPO: Evaluation](https://khalil-research.github.io/PyEPO/content/getting_started/evaluation.html) — regret definitions, normalization, and tied solutions.
