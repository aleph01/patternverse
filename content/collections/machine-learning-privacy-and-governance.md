---
id: machine-learning-privacy-and-governance
type: collection
title: "Privacy and governance"
summary: "Coordinate learning across data holders, bound disclosure, and carry evidence and limitations with datasets and models."
status: published
verses:
  - machine-learning
items:
  - ml-federated-learning
  - ml-differentially-private-training
  - ml-datasheets-for-datasets
  - ml-model-cards
---

Using a dataset or model responsibly requires knowing how contributions are handled and what the resulting artifact supports. This collection separates concrete protection mechanisms from the documentation needed to make informed reuse and release decisions.

## Specify how contributions are handled

[[ml-federated-learning|Federated Learning]] coordinates local training across participants. [[ml-differentially-private-training|Differentially Private Training]] bounds disclosure for a specified protected contribution under an explicit randomized mechanism. Local data retention and a quantified privacy guarantee answer different questions.

## Carry evidence with artifacts

[[ml-datasheets-for-datasets|Datasheets for Datasets]] documents collection, labels, composition, and reuse conditions. [[ml-model-cards|Model Cards]] documents a model release, its evaluation, intended uses, and limitations. Both depend on accurate, maintained evidence.

For the identities and compatible artifacts behind a release, see [[machine-learning-training-and-deployment|Training and deployment]].
