---
id: machine-learning-generative-systems
type: collection
title: "Generative systems"
summary: "Give a generative model task examples, source evidence, checked tools, and an explicit output language."
status: published
verses:
  - machine-learning
items:
  - ml-few-shot-in-context-learning
  - ml-retrieval-augmented-generation
  - ml-tool-augmented-interaction
  - ml-constrained-decoding
---

A generative model may need a task convention, information outside its parameters, access to an operation, or output that another system can parse. These patterns intervene at different points in that interaction.

## Supply useful context

[[ml-few-shot-in-context-learning|Few-Shot In-Context Learning]] supplies request–response demonstrations without updating model weights. [[ml-retrieval-augmented-generation|Retrieval Augmented Generation]] retrieves source evidence for the current request. Examples demonstrate a task; retrieved evidence supplies material an answer may need.

## Connect generation to an application

[[ml-tool-augmented-interaction|Tool-Augmented Interaction]] connects proposed operations to application checks, execution, and observed results. [[ml-constrained-decoding|Constrained Decoding]] restricts the output language during generation. A permitted operation or valid output still needs the appropriate semantic checks.

For adaptation that changes model parameters, see [[machine-learning-learning-and-adaptation|Learning and adaptation]].
