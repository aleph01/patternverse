---
id: machine-learning-inputs-and-features
type: collection
title: "Inputs and features"
summary: "Choose what the model sees and predicts, and retrieve features with the right meaning and history."
status: published
verses:
  - machine-learning
items:
  - ml-reframing
  - ml-multilabel
  - ml-hashed-feature
  - ml-feature-cross
  - ml-embedding
  - ml-multimodal-input
  - ml-feature-store
  - ml-point-in-time-feature-retrieval
---

A model can only learn from the distinctions its inputs and targets preserve. Start here when the output does not match the application, categories keep changing, or different input sources need to work together.

## Define the prediction

[[ml-reframing|Reframing]] compares what different targets and output representations support. [[ml-multilabel|Multilabel]] handles cases where several labels can apply to one input.

## Represent the evidence

[[ml-hashed-feature|Hashed Feature]] bounds a growing categorical representation. [[ml-feature-cross|Feature Cross]] makes selected joint conditions explicit. [[ml-embedding|Embedding]] learns vector representations from a training signal. [[ml-multimodal-input|Multimodal Input]] combines observation types while checking their association and missing-input policies.

## Retrieve the intended features

[[ml-feature-store|Feature Store]] connects shared definitions with training and operational retrieval. [[ml-point-in-time-feature-retrieval|Point-in-Time Feature Retrieval]] reconstructs which values were available for a historical decision.

For compatible preprocessing and release artifacts, continue with [[machine-learning-training-and-deployment|Training and deployment]].
