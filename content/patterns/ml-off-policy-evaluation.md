---
id: ml-off-policy-evaluation
type: pattern
title: 'Off-Policy Evaluation'
summary: 'Estimate how a proposed decision policy would perform from another policy’s logged actions and outcomes, while checking overlap, model assumptions, and uncertainty before deployment.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A help portal has a new rule for recommending articles: use A for routine questions and B for complex ones. The team wants evidence before changing what customers see. Historical logs contain contexts, recommendations, selection probabilities, and resolution outcomes, but each customer received only one article. The outcome under the alternative recommendation is missing.

Off-Policy Evaluation estimates a target policy's value using data collected by a different, logging policy. It can help screen candidates before an online test. It cannot manufacture evidence for choices the old system never made.

## Core idea

Evaluate the **decisions a policy would make**, rather than treating historical rewards as ordinary prediction labels. The quantity of interest is typically the target policy's expected reward in a specified population: for example, the probability that a request is resolved within 24 hours.

The historical average describes the logging policy. The target may choose different actions in the same contexts, so its value requires either predicting unobserved rewards, correcting unequal action frequencies, or combining those approaches. [Wang, Agarwal, and Dudík](https://proceedings.mlr.press/v70/wang17a.html) formalize this contextual-bandit evaluation problem and its statistical difficulty.

## How it works

Define the target policy, reward window, and evaluation population first. Assemble decision-time contexts, delivered actions, logged selection probabilities, eligible actions, and mature outcomes. Keep missing outcomes distinct from observed failures. A click, resolution, and long-term customer benefit are different targets.

Three common estimators make different assumptions. The **direct method (DM)** predicts the mean reward for each context–action pair, then averages the predictions for the target's choices. It can be systematically wrong where its reward model extrapolates poorly.

**Inverse propensity scoring (IPS)** weights each observed reward by π(a|x)/p(a|x), the target's probability of that action divided by the logger's probability. For a deterministic target, mismatching rows receive zero weight. Divide the weighted reward sum by all logged decisions, including those zero-weight rows. Correct propensities and support make IPS unbiased under the usual sampling assumptions, but rare actions can cause high variance.

**Doubly robust (DR)** estimation starts with the reward model's target prediction and adds an importance-weighted correction for its error on the observed action:

`DR row = predicted target reward + weight × (observed reward − predicted observed-action reward)`

Average those row values. For stochastic targets, the first term averages predictions over the target's action distribution. The [Open Bandit Pipeline estimator documentation](https://zr-obp.readthedocs.io/en/latest/estimators.html) presents these three formulas. The [original DR paper](https://arxiv.org/abs/1103.4601) analyzes how reward-model and propensity errors interact. Double robustness is a property under assumptions, not a promise that DR wins on every sample.

## Worked examples

### Three estimates from one log, fictional

Eight requests contain four Routine and four Complex contexts. The logger chooses A with probability 0.80 and B with probability 0.20. This particular sample contains three A choices and one B choice in each context group.

| Rows    | Context | Logged actions | Observed rewards |
| ------- | ------- | -------------- | ---------------- |
| R01–R04 | Routine | A, A, A, B     | 1, 1, 0, 1       |
| R05–R08 | Complex | A, A, A, B     | 0, 0, 1, 0       |

The target chooses A for Routine and B for Complex. Its reward model predicts 0.60 for Routine/A and 0.80 for Complex/B. DM is therefore (4 × 0.60 + 4 × 0.80)/8 = **0.700**. These predictions are supplied example values, not a model fitted on these eight outcomes.

Four rows match the target. IPS weights the three Routine/A rows by 1/0.80 = 1.25 and the Complex/B row by 1/0.20 = 5. Its value is (1.25 + 1.25 + 0 + 0)/8 = **0.3125**. The observed logging-policy reward mean, 4/8, answers a different question.

The model overpredicts R08: predicted reward is 0.80, observed reward is zero, so its **residual is 0 − 0.80 = −0.80**. The matching B action was rare, with weight five. Its correction is therefore **5 × (−0.80) = −4**, and its DR row value is **0.80 − 4 = −3.20**.

For the three matching Routine/A rows, residuals are 0.40, 0.40, and −0.60. Weighting each by 1.25 gives 0.50 + 0.50 − 0.75 = **0.25**. Other rows have zero correction. The mean correction is **(0.25 − 4)/8 = −0.46875**. Adding it to DM gives **0.700 − 0.46875 = 0.23125**. A DR row or final estimate can leave the reward range; it is not a customer's predicted probability.

![A reward-model average of 0.700 receives a weighted residual correction of minus 0.469, producing a doubly robust estimate of 0.231 in a fictional eight-row sample. A rare B observation contributes a large negative correction.](../assets/machine-learning/off-policy-evaluation.svg 'Start with the model’s average, then add its weighted observed errors. The rare B outcome contributes a large negative correction. These are estimates from one fictional sample, not measured deployment values.')

```patternverse-widget
{
  "src": "ml-off-policy-evaluation.html",
  "title": "Off-policy estimator comparison explorer",
  "height": 1200,
  "fallback": "One fictional eight-row log gives DM 0.700, IPS 0.3125, and DR 0.23125. Inspect the weighted residual correction and support. These sample estimates are not confidence guarantees."
}
```

### Optional: one sample versus repeated collection

The three estimates above use one observed eight-row log. To explain their statistical behavior, the explorer also defines a fictional world with rewards for every alternative action. Those hidden values give a target mean of **0.625**. Real logs do not reveal that full-information reference.

Now hold the eight contexts and all potential rewards fixed, but repeat the logger's random action draws. Average the estimate across every possible resulting log. With correct propensities, the expected IPS and DR both equal 0.625. This expectation over collection is different from the displayed sample estimate and from a confidence interval.

Deliberately pretending the logger was uniform changes expected IPS to 0.700 and expected DR to 0.760 with the approximate reward model. Replacing that model with the exact synthetic reward table restores DM and DR to 0.625, despite the incorrect weighting probabilities. This exact synthetic reference illustrates double robustness: either correct weighting probabilities or a correct reward model can remove the estimator’s bias under the required assumptions. It supplies no production counterfactual truth.

### A documented implementation and benchmark

[Vowpal Wabbit's OPE tutorial](https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/off_policy_evaluation.html) demonstrates evaluation of candidate policies from logged bandit data. Separately, [Open Bandit Dataset and Pipeline](https://arxiv.org/abs/2008.07146) provides logged recommendation data collected under multiple policies on ZOZOTOWN and benchmarks OPE methods. These are verified software and research examples; the help-portal numbers are invented.

## Assumptions for correctness

Support must hold wherever the target acts: a positive target probability requires positive logging probability for that action in that context. A-only logging cannot identify the target's Complex/B outcomes. DM can still print predictions there, but those predictions depend on unverifiable extrapolation from the log alone.

For standard guarantees, contexts and outcomes must represent the evaluation population, action probabilities must describe the actual selection mechanism, and observed outcomes must correspond to delivered actions. Known randomization supplies an assignment mechanism; estimated propensities from observational logs additionally require defensible assumptions about unobserved confounding.

Keep the target independent of evaluation outcomes. Fit reward and propensity models on separate data, or predict each evaluation fold with models trained on other folds, using suitable statistical procedures. Adaptive collection, repeated users, interference, and changing outcome definitions require analysis beyond an ordinary independent one-step sample.

## When to use it

Use OPE to compare supported recommendation, ranking, or routing policies when online testing is expensive and historical decision logs are trustworthy. It is especially useful for eliminating poor candidates and deciding which alternatives merit controlled exposure.

A one-step reward estimate does not establish long-term value when actions alter future states. Sequential reinforcement-learning evaluation needs trajectory-aware methods and additional assumptions. Poor overlap or immature outcomes may make the responsible conclusion insufficient evidence.

## Tradeoffs and operating costs

DM spends modeling effort and risks extrapolation bias. IPS spends effective information when a few observations carry most weight. DR adds reward modeling and residual diagnostics; it can still suffer high variance or misspecification problems.

Budget for log validation, outcome joins, model separation, slice checks, and uncertainty estimation appropriate to the collection process. Report overlap and weight concentration alongside point estimates. Choosing whichever estimator gives the largest value creates another selection problem.

## Common mistakes and limitations

Matching-row averages are generally wrong under nonuniform logging. Missing support is not fixed by clipping weights or adding a reward model. Incorrect propensities can produce plausible estimates, and a favorable point estimate is not evidence of statistically credible improvement.

Do not tune many policies on one evaluation log and report the winner as independently validated. Confirm promising candidates through an appropriately designed online test. The explorer uses deterministic potential rewards, fixed model predictions, complete outcomes, and eight contexts; its exact toy expectations are not confidence intervals for real deployments.

## Related patterns

[[ml-controlled-exploration-with-propensity-logging|Controlled Exploration with Propensity Logging]] creates interpretable feedback; OPE consumes that feedback to assess a target. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects model and policy selection boundaries. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks where support or performance differs. [[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] manages subsequent production exposure; offline estimates do not replace its safeguards.

## Sources and further reading

- [Dudík, Langford, and Li: Doubly Robust Policy Evaluation and Learning](https://arxiv.org/abs/1103.4601) — combining model predictions and weighted residuals.
- [Wang, Agarwal, and Dudík: Optimal and Adaptive Off-policy Evaluation](https://proceedings.mlr.press/v70/wang17a.html) — support, variance, and estimator tradeoffs.
- [Open Bandit Pipeline: estimators](https://zr-obp.readthedocs.io/en/latest/estimators.html) — DM, IPS/IPW, and DR formulas and limitations.
- [Vowpal Wabbit: offline policy evaluation](https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/off_policy_evaluation.html) — documented candidate-policy evaluation workflows.
- [Saito et al.: Open Bandit Dataset and Pipeline](https://arxiv.org/abs/2008.07146) — real logged data and reproducible OPE benchmarking.
