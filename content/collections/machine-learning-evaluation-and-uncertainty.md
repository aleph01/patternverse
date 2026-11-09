---
id: machine-learning-evaluation-and-uncertainty
type: collection
title: "Evaluation and uncertainty"
summary: "Establish credible comparisons, inspect failures, and decide what prediction scores and uncertainty justify."
status: published
verses:
  - machine-learning
items:
  - ml-heuristic-benchmark
  - ml-leakage-safe-evaluation
  - ml-behavioral-testing
  - ml-slice-based-evaluation
  - ml-explainable-predictions
  - ml-probability-calibration
  - ml-conformal-prediction
  - ml-selective-prediction
---

A headline score leaves several questions unanswered: what was the reference, which cases failed, and what does a confident answer mean? Start with the comparison and information boundaries, then inspect behavior and uncertainty.

## Establish trustworthy evidence

[[ml-heuristic-benchmark|Heuristic Benchmark]] compares a model with useful simple alternatives. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] keeps unavailable information out of evaluation. [[ml-behavioral-testing|Behavioral Testing]] checks specific expectations, and [[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals results hidden by averages.

## Interpret an output and its uncertainty

[[ml-explainable-predictions|Explainable Predictions]] examines how a reference and attribution method allocate one model output. [[ml-probability-calibration|Probability Calibration]] checks whether probability values match observed frequencies. [[ml-conformal-prediction|Conformal Prediction]] constructs outcome sets under a stated coverage procedure. [[ml-selective-prediction|Selective Prediction]] determines which answers to automate and which to defer.

For recurring evaluation after release, continue with [[machine-learning-monitoring-and-robustness|Monitoring and robustness]].
