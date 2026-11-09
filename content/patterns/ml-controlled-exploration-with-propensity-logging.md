---
id: ml-controlled-exploration-with-propensity-logging
type: pattern
title: 'Controlled Exploration with Propensity Logging'
summary: 'Deliberately sample among eligible actions and record their actual selection probabilities, creating feedback that can support learning and evaluation beyond the current policy.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A help portal always recommends article A because its current model ranks A first. A collects clicks and resolution outcomes; articles B and C collect almost none. When a new model recommends B for difficult questions, historical logs cannot simply reveal whether that change would help. The old system decided which outcomes became observable.

Sample among eligible actions and log each delivered action’s selection probability. This creates evidence about alternatives, at the cost of exposing users to choices the current policy would usually avoid.

## Core idea

A **propensity** is the probability that the serving policy selects an action in this context under its current rules. It describes selection, not correctness or click probability. Keep the collection process with each example.

The **logging policy** generated the historical actions. The **target policy** is the alternative being evaluated or learned. Their different action frequencies make ordinary reward averages unsuitable for evaluating another policy.

## How it works

First define the eligible action set and an outcome, such as resolving a help request within a fixed observation window. Exclude unavailable or unsuitable articles, recognizing that the log can evaluate only the resulting action space.

One simple strategy is epsilon-greedy: follow the preferred action with probability 1 − ε, and with probability ε choose uniformly among K eligible actions. The preferred action therefore has probability **1 − ε + ε/K**, because exploration can choose it too. Every other eligible action has probability ε/K. [Vowpal Wabbit's contextual-bandit tutorial](https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/python_Contextual_bandits_and_Vowpal_Wabbit.html) documents this strategy and its action, cost, and probability input fields.

Sample from the final distribution, then durably record the decision ID, decision-time context, eligible actions, chosen action, selection probability, and policy/configuration version. Join the eventual reward by decision ID. Preserve pending or missing outcomes separately from measured zero rewards. Filters, fallbacks, and overrides must be reflected in the probability of the delivered action; a probability from an earlier stage may describe a different experiment.

For a fixed target policy π, inverse propensity scoring uses a weight **w = π(a|x)/p(a|x)** on each logged reward. The IPS estimate is the sum of weighted rewards divided by the total number of logged decisions, including zero-weight rows. [Wang, Agarwal, and Dudík](https://proceedings.mlr.press/v70/wang17a.html) formalize this evaluation problem and its support and variance constraints.

## Worked examples

### Collecting useful alternatives, fictional

The portal prefers A, with B and C also eligible. With ε = 0.30 and K = 3, probabilities are A: 0.80, B: 0.10, C: 0.10. The fraction choosing something other than A is 20%, rather than 30%, because some exploration draws still select A.

Of the 30% exploration draws, one-third choose each action. A therefore receives **70% + 10% = 80%**; B and C receive 10% each. The probabilities describe choices before the sampling draw, not how surprising the result looks afterward.

One decision might record `id=R09, context=Complex, actions=[A,B,C], chosen=B, p=0.10, policy=v1`. Its eventual resolution reward is 1. Logging 0.30 would confuse the exploration probability with the action probability; logging 1 because B was selected would erase the randomization entirely.

### Connecting a delivered action to its outcome

Suppose the service first samples B, then discovers B is unavailable and delivers A instead. The earlier 0.10 is not automatically A's propensity. The collection design must account for that fallback and log the final delivered action's probability. Otherwise later weighting describes an action the user did not receive.

A reward may arrive hours later. Joining “resolved within 24 hours” to R09 preserves which decision earned that outcome. An unobserved reward remains pending or missing; filling it with zero changes the meaning of the log. These fictional cases show why sampling and logging belong in one design.

### Why the probability matters for evaluation

Ten decisions contain five Routine and five Complex requests. The target chooses A for Routine and B for Complex. Only four rows match the target; the other six receive weight zero.

| Row | Context | Chosen | Logged probability | Reward | Target weight |
| --- | ------- | ------ | ------------------ | ------ | ------------- |
| R01 | Routine | A      | 0.80               | 1      | 1.25          |
| R02 | Routine | A      | 0.80               | 0      | 1.25          |
| R04 | Routine | A      | 0.80               | 1      | 1.25          |
| R09 | Complex | B      | 0.10               | 1      | 10            |

IPS is (1.25 + 0 + 1.25 + 10) / 10 = **1.25**. A finite IPS estimate can exceed the reward range: it is an importance-weighted estimate, not a calibrated probability. This tiny sample is dominated by one rare action. The matched-row average, 3/4, ignores that unequal sampling.

![Controlled sampling gives A probability 0.8 and B and C probability 0.1 each. A logged B outcome receives importance weight ten when evaluating a target that chooses B. Four matching rows produce an unstable IPS estimate of 1.25.](../assets/machine-learning/controlled-exploration-with-propensity-logging.svg 'Trace B from its 0.10 selection probability to the logged decision. Evaluating a target that always chooses B gives that matching outcome weight ten, showing why rare actions make estimates unstable.')

### Optional: alternative evaluation summaries

[[ml-off-policy-evaluation|Off-Policy Evaluation]] develops estimator comparisons. The explorer also exposes two variants. Self-normalized IPS divides weighted rewards by total weight: **12.5/13.75 ≈ 0.909**. With a positive denominator it stays within the observed reward range, but generally has finite-sample bias. [Swaminathan and Joachims](https://papers.nips.cc/paper/2015/hash/39027dfad5138c9ca0c474d71db915c3-Abstract.html) develop the self-normalized estimator. Capping weights at two instead gives **4.5/10 = 0.45**, trading variance against bias.

```patternverse-widget
{
  "src": "ml-controlled-exploration-with-propensity-logging.html",
  "title": "Exploration and propensity logging explorer",
  "height": 1200,
  "fallback": "Exploration probability 0.30 over A/B/C gives action probabilities 0.80/0.10/0.10. Inspect delivered actions and logged propensities. Rare actions create large evaluation weights; zero exploration leaves some target choices unsupported."
}
```

The explorer recomputes actions from fixed illustrative sampling draws, logs their probabilities, and calculates every contribution. Full potential outcomes exist only inside its synthetic world. Real logs reveal only the selected action's reward.

### A verified research example

[Li and colleagues](https://arxiv.org/abs/1003.5956) evaluated contextual-bandit news recommendation with randomized Yahoo! Front Page logs and compared offline replay with online evaluation. Their rejection-based replay method relies on its collection assumptions; it is not permission to average matching rows from an arbitrary nonuniform log. These are documented research results, separate from the invented portal.

## Assumptions for correctness

Support is contextual: whenever the target might select an action, the logging policy must have given that action positive probability in that context. Seeing B somewhere in the log does not establish support for B everywhere. Deterministic A-only serving cannot identify B's value by reweighting.

Standard IPS guarantees require actions to follow the logged randomization, rewards to correspond to the delivered actions, and contexts to represent the evaluation population. With support and finite expected rewards, IPS is unbiased for a fixed target evaluated independently of its selection. A single small sample can still be highly inaccurate. For adaptive collection, probabilities must condition on the information and history used at each decision; independent-data uncertainty formulas may no longer apply.

Outcomes must correspond to the delivered action, with comparable definitions and observation windows. Interference between users, changing populations, or actions that alter future states can exceed a one-step contextual-bandit model.

## When to use it

Use this pattern for repeated choices with partial feedback, such as selecting help content, recommendations, or approved interface variants. It helps when the current policy controls which alternatives generate evidence, and limited exploration has an acceptable cost.

It contributes little when labels for every alternative are already available. It cannot justify exploring ineligible actions or evaluate a target outside the explored action space.

## Tradeoffs and operating costs

Exploration may sacrifice immediate reward. Smaller exploration probabilities reduce that exposure but make alternative actions rare and their weights large. More data does not compensate quickly for extremely poor overlap.

Budget for decision logging, version retention, delayed-outcome joins, and monitoring of missing events and probability distributions. Inspect whether a few decisions dominate evaluation weight. Concentration diagnostics are not confidence intervals. [Doubly robust evaluation](https://arxiv.org/abs/1103.4601) combines reward modeling with propensity correction, adding modeling work rather than eliminating these responsibilities.

## Common mistakes and limitations

Do not substitute a class probability for an action propensity, reconstruct old probabilities using today's policy, or silently label missing rewards as failures. Repeatedly choosing the best-looking target on the same evaluation log creates optimism; retain independent evaluation data and quantify uncertainty.

Clipping and self-normalization do not repair zero support. A supported action with no matches in one small sample also provides weak evidence: an IPS value of zero does not establish that the action is worthless. The explorer demonstrates arithmetic, not statistical significance.

## Related patterns

[[ml-active-learning|Active Learning]] chooses which examples to label; exploration chooses which actions generate observable outcomes. [[ml-probability-calibration|Probability Calibration]] concerns reliable outcome probabilities, whereas propensities describe the selection mechanism. [[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] controls release exposure and recovery; exploration controls information collection. **A/B Testing** compares assigned treatments, while [[ml-off-policy-evaluation|Off-Policy Evaluation]] can assess other supported policies from the resulting action logs.

## Sources and further reading

- [Vowpal Wabbit: contextual bandits](https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/python_Contextual_bandits_and_Vowpal_Wabbit.html) — exploration and logged action probabilities.
- [Wang, Agarwal, and Dudík: off-policy evaluation](https://proceedings.mlr.press/v70/wang17a.html) — importance weights, support, and estimator variance.
- [Swaminathan and Joachims: self-normalized estimation](https://papers.nips.cc/paper/2015/hash/39027dfad5138c9ca0c474d71db915c3-Abstract.html) — normalization and counterfactual learning.
- [Li et al.: offline evaluation of news recommendation](https://arxiv.org/abs/1003.5956) — randomized logs and verified Yahoo! evaluation.
- [Dudík, Langford, and Li: doubly robust evaluation](https://arxiv.org/abs/1103.4601) — combining reward models and propensity-based correction.
