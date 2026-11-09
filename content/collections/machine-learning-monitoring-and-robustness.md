---
id: machine-learning-monitoring-and-robustness
type: collection
title: "Monitoring and robustness"
summary: "Notice changing conditions, measure deployed quality, and train against specified sources of failure."
status: published
verses:
  - machine-learning
items:
  - ml-continuous-model-evaluation
  - ml-drift-detection
  - ml-worst-group-optimization
  - ml-domain-invariant-representation-learning
  - ml-adversarial-training
---

Models meet changing inputs, uneven performance, and deliberate or accidental stress. This collection connects ways to observe those problems with training responses aimed at particular failure conditions. Each response has its own assumptions; a change alert alone does not establish which remedy will help.

## Observe what changes

[[ml-continuous-model-evaluation|Continuous Model Evaluation]] joins predictions with arriving outcomes while tracking label coverage. [[ml-drift-detection|Drift Detection]] compares data with an identified reference and keeps change signals separate from measured quality.

## Train for specified failure conditions

[[ml-worst-group-optimization|Worst-Group Optimization]] targets the largest loss among specified groups. [[ml-domain-invariant-representation-learning|Domain-Invariant Representation Learning]] limits unwanted domain information in features. [[ml-adversarial-training|Adversarial Training]] trains against difficult inputs inside a defined perturbation set.

Use [[machine-learning-evaluation-and-uncertainty|Evaluation and uncertainty]] to establish the comparisons needed to assess these responses, including behavior on relevant slices.
