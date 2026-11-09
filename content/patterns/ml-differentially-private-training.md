---
id: ml-differentially-private-training
type: pattern
title: 'Differentially Private Training'
summary: 'Bound each protected contribution, add calibrated randomness during learning, and account for the privacy loss of the complete released training process.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support team wants to train a routing model on customer messages. Removing names from the table does not answer a harder question: could the released model reveal something about a particular message or customer? Restricting access to the training database also leaves the model's outputs to consider.

Differentially Private Training builds a quantitative disclosure bound into learning. It limits how much the distribution of released results can change when one protected contribution changes. The pattern requires a defined privacy unit, a randomized mechanism, and accounting for the complete process.

## Core idea

Make each contribution bounded, obscure its influence with calibrated noise, and keep a ledger of repeated access. The guarantee concerns a randomized algorithm across possible datasets and random draws; observing a small change on one example does not establish it.

Imagine rerunning a randomized training procedure on datasets differing in one protected contribution. Differential privacy bounds how much the chance of any set of released outputs can change. The multiplicative bound is controlled by ε; δ is an additive allowance. Smaller ε is tighter at fixed δ. Neither is an accuracy score or a percentage of records exposed. [Dwork and Roth](https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf) explain this definition.

“Neighboring” needs an explicit meaning: replacing one message differs from changing all messages belonging to one customer. A record-level statement cannot simply be relabeled as user-level protection.

## How it works

### Bound and perturb each update

A common implementation is **DP-SGD**, differentially private stochastic gradient descent. Compute each example’s gradient, which describes how changing each parameter changes its loss. Limit its whole vector to Euclidean length **C**, then sum the bounded vectors, add calibrated Gaussian noise, normalize, and update the model. [Abadi and colleagues](https://arxiv.org/abs/1607.00133) combine this training approach with privacy accounting.

The clipping rule is `ḡ = g × min(1, C / ||g||₂)`: keep a short vector unchanged and scale a long one down without changing its direction. A zero vector stays zero.

### Account for the complete process

Clipping the already averaged gradient does not bound each example separately. Likewise, ordinary optimization noise is not automatically calibrated privacy noise. The accountant must match the adjacency definition, noise scale, sampling procedure, and number of steps. The official [Opacus tutorial](https://opacus.ai/tutorials/intro_to_advanced_features) explains per-example clipping and Poisson sampling, where each record is independently included. Shuffling fixed batches is a different procedure.

The usual central-DP setting trusts the training service with raw data and protects the released result. Local DP, which randomizes information before it reaches an untrusted collector, has a different trust boundary.

## Worked examples

### A bounded update

Four fictional messages produce gradients at one model state. Record A has vector (3, 4), whose length is **√(3² + 4²) = 5**. With C = 1, divide both coordinates by five to get (0.6, 0.8). Apply the same rule to every record:

| Record | Raw gradient | After L2 clipping at C = 1 |
| ------ | ------------ | -------------------------- |
| A      | (3, 4)       | (0.6, 0.8)                 |
| B      | (0, 2)       | (0, 1)                     |
| C      | (−2, 0)      | (−1, 0)                    |
| D      | (0, −0.5)    | (0, −0.5)                  |

The raw vectors sum to (1, 5.5); the clipped vectors sum to **(−0.4, 1.3)**. Separate clipping changes the aggregate's direction too. For the randomized mechanism, add independent Gaussian noise with standard deviation 4 to each sum coordinate.

To show one update reproducibly, the public replay uses fixed standardized values (0.25, −0.5), giving noise **4 × (0.25, −0.5) = (1, −2)**. The perturbed sum is (0.6, −0.7). Divide by four records to get **(0.15, −0.175)**. Subtracting 0.10 times this mean from parameters (0, 0) gives **(−0.015, 0.0175)**. Fixed public noise teaches arithmetic and provides no privacy.

![Four record gradients are clipped individually, summed, perturbed, and used in a model update. A separate ledger accounts for the full randomized process under replace-one adjacency.](../assets/machine-learning/differentially-private-training.svg 'Follow clipping before summation, then perturbation and the update. The separate ledger analyzes fresh randomized noise; the public fixed values shown for arithmetic provide no privacy.')

### Why repeated access needs a ledger

The explorer keeps the update replay separate from its randomized-mechanism accounting. With four fixed slots and **replace-one-record adjacency**, a clipped sum has sensitivity at most **2C**: replacement can move a vector between opposite ends of the radius-C ball. Noise standard deviation is σC, so σ = 4 means standard deviation 4 when C = 1.

For **T** full-batch accesses, the ledger first computes **ρ = 2T/σ²**, a privacy-cost parameter in zero-concentrated differential privacy, or zCDP. At σ = 4 and T = 1, **ρ = 2/16 = 0.125**. Conversion at δ = 0.00001 gives **ε ≈ 2.5243**; four accesses raise it to **5.2985**. No subsampling amplification is included.

### Optional: the formal bound

For neighboring datasets D and D′ and randomized mechanism M, the definition is `Pr[M(D) ∈ S] ≤ exp(ε)Pr[M(D′) ∈ S] + δ` for every output event S. The ledger converts its composed ρ using **ε = ρ + 2√(ρ ln(1/δ))**. [Bun and Steinke](https://arxiv.org/abs/1605.02065) establish this valid, potentially loose conversion; it is not an optimal ε.

```patternverse-widget
{
  "src": "ml-differentially-private-training.html",
  "title": "Private training clipping and accounting explorer",
  "height": 1200,
  "fallback": "Inspect one clipped update and a separate privacy ledger. Public fixed replay noise provides no privacy. The specified randomized full-batch mechanism gives ε ≤ 2.5243 for one access at δ = 0.00001."
}
```

### Several messages per customer

In another fictional example, suppose one customer contributes twenty messages. Clipping each message at C = 1 still allows that customer a much larger total contribution than someone contributing once. For direct user-level training, first define one contribution from all that customer's messages, then bound that entire contribution and calibrate the mechanism for user-level neighbors. This changes weighting, sampling, and accounting. Merely deleting the customer identifier does not perform those steps.

### A documented deployment

Xu and colleagues' [2023 Gboard study](https://research.google/pubs/federated-learning-of-gboard-language-models-with-differential-privacy/) describes more than twenty trained and deployed language models with formal privacy guarantees. Their method uses DP-FTRL and client participation controls, with public-data pretraining. It demonstrates private training beyond DP-SGD; it is not an implementation of this four-record example.

## Assumptions for correctness

The explorer's bound assumes a fixed public record count, replacement of one record, full-batch access, fixed positive C and σ, and fresh independent Gaussian noise at every access. Conditional on previous noisy states, each record must still affect only its own bounded contribution. Shared private preprocessing or cross-example normalization can break that argument.

The replay exposes raw gradients and fixed noise for teaching; its privacy bound applies only to the separately specified randomized mechanism. A real implementation must protect those intermediate values and randomness, use an appropriate secure random generator, and release only outputs covered by its analysis. Public initial parameters or appropriately accounted private initialization are required.

## When to use it

Use this pattern when a model must learn population-level regularities while bounding disclosure attributable to a specified participant. It is especially relevant when models or their predictions reach people outside the trusted training service.

First establish that the task has enough signal at the intended privacy level. A tiny dataset or a task depending on rare individual facts may provide little useful accuracy under the required protection.

## Tradeoffs and operating costs

Clipping introduces bias; noise introduces variability. Increasing C while keeping σ fixed increases absolute noise as well as the sensitivity bound, so the explorer's ε stays unchanged. Larger σ tightens its bound but increases perturbation. More accesses consume more privacy budget; they do not guarantee better utility.

Budget for per-example gradient computation, memory, compatible model layers, accounting, and evaluation. Public-data pretraining can reduce private learning work, but subsequent private accesses still count. Choosing hyperparameters or selecting checkpoints using private validation requires its own justified treatment.

## Common mistakes and limitations

Do not publish private gradients, unprotected training metrics, or raw examples alongside a private model. Retrying training and releasing additional candidates requires composition; a fresh job name does not reset the budget. Predictions made solely from the already private model are postprocessing and do not spend another training budget; accessing private data again needs separate analysis. Reusing a fixed public noise sequence defeats the intended randomized protection.

Differential privacy does not establish model accuracy, fairness, resistance to poisoning, or confidentiality of the training service. It permits learning population facts. Report the privacy unit, adjacency, ε, δ, accountant, sampling assumptions, and covered releases together; an isolated ε obscures the actual claim. Decide what protection the application requires rather than treating any finite ε as sufficient.

## Related patterns

[[ml-federated-learning|Federated Learning]] changes where computation happens; private training additionally bounds disclosure. **Secure Aggregation** hides individual updates within its protocol, while differential privacy limits what the released aggregate or model reveals. [[ml-self-supervised-pretraining|Self-Supervised Pretraining]] can learn representations from public data before private adaptation. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks whether utility costs concentrate in particular groups, with private evaluation itself included in the disclosure plan.

## Sources and further reading

- [Dwork and Roth: The Algorithmic Foundations of Differential Privacy](https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf) — definitions, trust boundaries, composition, and postprocessing.
- [Abadi et al.: Deep Learning with Differential Privacy](https://arxiv.org/abs/1607.00133) — DP-SGD and moments accounting.
- [Bun and Steinke: Concentrated Differential Privacy](https://arxiv.org/abs/1605.02065) — Gaussian mechanisms, adaptive composition, and conversion to approximate DP.
- [Opacus: Introduction to advanced features](https://opacus.ai/tutorials/intro_to_advanced_features) — clipping, noise, and sampling implementation requirements.
- [Xu et al.: Gboard language models with differential privacy](https://research.google/pubs/federated-learning-of-gboard-language-models-with-differential-privacy/) — documented DP-FTRL deployment.
