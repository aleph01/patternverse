---
id: ml-federated-learning
type: pattern
title: 'Federated Learning'
summary: 'Train a shared model through coordinated local learning at separate data holders, aggregating compatible updates while accounting for participation, unequal data, and explicit privacy mechanisms.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

Three maintenance firms want a shared model for sensor corrections. Each holds calibration records that it cannot conveniently pool with the others. Training three isolated models wastes opportunities to learn common behavior, but moving every record into one database is not an acceptable starting point.

Federated Learning coordinates training across those data holders. A shared model travels to participating clients, clients learn from local records, and their returned updates contribute to the next shared model. The architecture changes where training happens; it does not, by itself, establish a privacy guarantee.

## Core idea

Move learning computation toward the records and coordinate what is learned. A **client** can be a phone, an organization, or another participant that holds a local dataset. A coordinator manages model versions, participation, and aggregation.

This article focuses on synchronous, server-coordinated training with local client computation. In **Federated Averaging (FedAvg)**, clients start from the same model, take several local optimization steps, and return compatible model values or updates. The coordinator combines them before the next round. [McMahan and colleagues](https://proceedings.mlr.press/v54/mcmahan17a.html) introduced this communication-efficient approach.

## How it works

Define a shared prediction task, feature meaning, model architecture, and objective. Agree on which records count and how clients report their contribution sizes. Select available participants and send a versioned starting model with local training instructions.

Each participant performs local training without contributing its raw records to a pooled training table. It returns an update in the agreed parameter space. In the example-weighted variant used here, the next model is the sum of participating clients' final model values weighted by **nₖ / sum of participating nₖ**. Averaging deltas from the same starting model is equivalent.

The denominator must describe the updates actually included. A client with no returned update does not silently contribute a zero model. The coordinator validates the round and model version, aggregates valid returns, evaluates the candidate, and either continues or retains the previous model.

The [federated-learning survey](https://arxiv.org/abs/1912.04977) distinguishes settings with many intermittently available devices from those involving a smaller number of organizations. Differences in data distributions, compute, connectivity, and participation make this more than ordinary training with a distributed execution engine.

## Worked examples

### One aggregation round, fictional

The maintenance firms fit the scalar model `prediction = w × x`, starting at w = 0. Their normalized calibration records are:

| Client | Records (x, y)                 | Count |
| ------ | ------------------------------ | ----- |
| A      | (1, 0), (1, 1), (1, 1), (1, 2) | 4     |
| B      | (2, 3), (2, 5)                 | 2     |
| C      | (1, −1), (1, −1)               | 2     |

Each client minimizes mean half-squared error: average `(w × x − y)² / 2`. A local full-batch gradient is the average of `x × (w × x − y)`. For B at w = 0, the two contributions are **2 × (0 − 3) = −6** and **2 × (0 − 5) = −10**. Their mean gradient is −8. Subtracting 0.10 × (−8) gives **w = 0.80**. Repeating at that new value gives B’s second local value 1.28. The two-step results are:

| Client | First local value | Second local value | Aggregation weight |
| ------ | ----------------- | ------------------ | ------------------ |
| A      | 0.10              | 0.19               | 4/8                |
| B      | 0.80              | 1.28               | 2/8                |
| C      | −0.10             | −0.19              | 2/8                |

The shared value becomes `(4 × 0.19 + 2 × 1.28 − 2 × 0.19)/8` = **0.3675**. Giving each client equal weight instead produces approximately **0.4267**. That is a different client-balanced objective, not necessarily a mistake. The intended objective determines which weighting makes sense.

The explorer computes every gradient, local model, aggregation weight, and round. It counts logical scalar parameter transmissions, not real network bytes. All participants are simulated in one page; it is not a distributed or privacy-preserving runtime.

![A common starting model is sent to three clients. Two local gradient steps produce scalar model values 0.19, 1.28, and minus 0.19; weighting their four, two, and two examples gives the next shared value 0.3675.](../assets/machine-learning/federated-learning.svg 'Every client starts from the same weight, trains locally, and returns a model value. Contribution counts determine the displayed weighted average. The fictional round includes no secure aggregation or privacy mechanism.')

```patternverse-widget
{
  "src": "ml-federated-learning.html",
  "title": "Federated training round explorer",
  "height": 1200,
  "fallback": "Three clients take two local steps from the same starting weight, then combine their updates to give w = 0.3675. Participation and weighting change the result. No secure aggregation or differential privacy runs."
}
```

### Local work and participation, fictional

With one local step and example weighting, aggregation gives **0.225**, exactly the corresponding pooled-data gradient step. With two local steps, however, centralized training reaches **0.410625**, rather than 0.3675. B’s larger x values make its gradient change more rapidly with w. This difference in loss curvature makes several local steps follow a different path from repeated pooled-data updates.

If only A and C participate, their weights become 4/6 and 2/6. Two local steps yield approximately **0.06333**. That matches this subset's centralized result, but changes the population being optimized. The explorer reports references for both participating and all clients so these two effects are distinguishable. These centralized references are counterfactual calculations available inside the simulation. With no participants, it retains the previous model and reports no update.

The global example-weighted loss falls from 2.625 to approximately 1.9163 in the default round. Yet C's local loss rises from 0.50 to approximately 0.9350. Better average performance does not imply improvement for every participant.

### A verified deployment

In their [2023 Gboard study](https://research.google/pubs/federated-learning-of-gboard-language-models-with-differential-privacy/), Xu and colleagues describe training and deploying more than twenty language models using federated learning with explicit differential-privacy guarantees. Two models additionally used secure aggregation. These documented systems combine optimization with additional protections; the calibration example is invented and supplies neither protection.

## Assumptions for correctness

Returned parameters must belong to the same model version and coordinate system. Clients need compatible feature definitions and preprocessing, a shared loss, and a clear treatment of local steps and contribution counts. Averaging unrelated models does not create those agreements.

The numerical example assumes honest clients, synchronous successful returns, stable records, and a fixed participant set across the requested rounds. General learning quality also depends on the optimizer, data heterogeneity, and which clients are available. Example counts do not correct systematic participation bias.

Privacy requires a threat model. [Deep Leakage from Gradients](https://papers.neurips.cc/paper_files/paper/2019/hash/60a6c4002cc7b29142def8871531281a-Abstract.html) demonstrates reconstruction attacks under particular conditions; shared gradients or updates are not automatically harmless. [Secure aggregation](https://research.google/pubs/practical-secure-aggregation-for-privacy-preserving-machine-learning/) can hide individual contributions from the aggregator within its protocol assumptions. It does not itself supply a differential-privacy bound for the aggregate or final model. Differential privacy additionally needs a specified privacy unit, mechanism, and accounting across training.

## When to use it

Use federated learning when separately held data can improve a shared task, pooling records is undesirable or impractical, and participants can support a common training protocol. It can suit both device populations and cooperating organizations, with different operational requirements.

Prefer a simpler training architecture when moving data is acceptable and centralization meets the task's needs. If feature meanings, labels, incentives, or target populations are fundamentally incompatible, federation does not resolve that disagreement.

## Tradeoffs and operating costs

More local computation can reduce communication rounds but increase divergence between client updates. Larger models increase download and upload costs. Slow clients, interrupted connectivity, retries, and secure protocols affect elapsed time and resource use.

Budget for orchestration, validation, privacy accounting where applicable, model evaluation, and incident handling. Evaluate both aggregate and client/group behavior. A single shared model may need personalization, but that introduces additional objectives and deployment complexity.

## Common mistakes and limitations

Do not equate local records with guaranteed confidentiality, encryption with differential privacy, or example weighting with fairness. Plain FedAvg is not a defense against malicious updates or falsified contribution counts.

Do not compare different participation sets as though only the optimizer changed. Availability rules can underrepresent some populations. The explorer excludes poisoning, stochastic minibatches, compression, private aggregation, privacy noise, and real device scheduling; its scalar regression illustrates the mechanism rather than realistic language-model performance.

## Related patterns

**Data-parallel training** distributes computation; federation additionally confronts separately controlled data and participation constraints. **Secure Aggregation** protects an aggregation operation, while [[ml-differentially-private-training|Differentially Private Training]] bounds information disclosure under a specified mechanism. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks whether the shared result conceals regressions for particular clients or groups.

## Sources and further reading

- [McMahan et al.: Communication-Efficient Learning from Decentralized Data](https://proceedings.mlr.press/v54/mcmahan17a.html) — FedAvg and local computation between communication rounds.
- [Kairouz et al.: Advances and Open Problems in Federated Learning](https://arxiv.org/abs/1912.04977) — settings, heterogeneity, systems, and research limitations.
- [Bonawitz et al.: Practical Secure Aggregation](https://research.google/pubs/practical-secure-aggregation-for-privacy-preserving-machine-learning/) — protecting individual contributions within an aggregation protocol.
- [Xu et al.: Gboard language models with differential privacy](https://research.google/pubs/federated-learning-of-gboard-language-models-with-differential-privacy/) — verified training and deployment with explicit privacy mechanisms.
- [Zhu, Liu, and Han: Deep Leakage from Gradients](https://papers.neurips.cc/paper_files/paper/2019/hash/60a6c4002cc7b29142def8871531281a-Abstract.html) — demonstrated gradient-reconstruction risks.
