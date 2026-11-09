---
id: machine-learning-learning-and-adaptation
type: collection
title: "Learning and adaptation"
summary: "Obtain useful training signals, reuse learned behavior, and compare ways to fit or update a model."
status: published
verses:
  - machine-learning
items:
  - ml-active-learning
  - ml-weak-supervision
  - ml-label-preserving-augmentation
  - ml-class-rebalancing
  - ml-transfer-learning
  - ml-self-supervised-pretraining
  - ml-hyperparameter-tuning
  - ml-ensembling
  - ml-knowledge-distillation
  - ml-replay-based-continual-learning
---

Begin here when labels are expensive, training data is uneven, or a model needs to reuse or retain useful behavior. The collection follows the training signal from its source through fitting and later updates.

## Make better use of available data

[[ml-active-learning|Active Learning]] chooses examples for annotation. [[ml-weak-supervision|Weak Supervision]] combines imperfect labeling sources. [[ml-label-preserving-augmentation|Label-Preserving Augmentation]] constructs additional views whose targets remain justified. [[ml-class-rebalancing|Class Rebalancing]] changes class influence during fitting.

## Reuse and compare learned behavior

[[ml-transfer-learning|Transfer Learning]] adapts a pretrained starting point. [[ml-self-supervised-pretraining|Self-Supervised Pretraining]] constructs training targets from raw data. [[ml-hyperparameter-tuning|Hyperparameter Tuning]] compares configurations within a declared budget. [[ml-ensembling|Ensembling]] combines predictions with different error patterns, while [[ml-knowledge-distillation|Knowledge Distillation]] trains a student to imitate a teacher.

## Retain behavior during updates

[[ml-replay-based-continual-learning|Replay-Based Continual Learning]] mixes selected past examples into later training. For evidence that any of these choices improves the intended use, continue with [[machine-learning-evaluation-and-uncertainty|Evaluation and uncertainty]].
