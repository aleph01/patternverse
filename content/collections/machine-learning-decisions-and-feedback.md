---
id: machine-learning-decisions-and-feedback
type: collection
title: "Decisions and feedback"
summary: "Connect predictions to constrained actions, collect informative feedback, and evaluate alternative policies."
status: published
verses:
  - machine-learning
items:
  - ml-decision-focused-learning
  - ml-hierarchical-forecast-reconciliation
  - ml-controlled-exploration-with-propensity-logging
  - ml-off-policy-evaluation
---

A prediction becomes useful through a decision: a schedule, a resource allocation, a set of forecasts, or an action shown to a user. Begin here when ordinary prediction error does not capture that decision, or when the current policy determines which feedback becomes observable.

## Respect the downstream decision

[[ml-decision-focused-learning|Decision-Focused Learning]] trains for the quality of actions chosen through an optimization problem. [[ml-hierarchical-forecast-reconciliation|Hierarchical Forecast Reconciliation]] makes linked forecasts add up, while evaluating forecast accuracy separately from coherence.

## Learn from actions and outcomes

[[ml-controlled-exploration-with-propensity-logging|Controlled Exploration with Propensity Logging]] samples eligible alternatives and records their actual selection probabilities. [[ml-off-policy-evaluation|Off-Policy Evaluation]] uses logged actions and outcomes to assess a supported alternative policy.

For general prediction metrics and uncertainty, see [[machine-learning-evaluation-and-uncertainty|Evaluation and uncertainty]].
