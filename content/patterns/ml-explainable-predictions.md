---
id: ml-explainable-predictions
type: pattern
title: 'Explainable Predictions'
summary: 'Accompany a particular model output with a checked explanation of its relationship to inputs, making the reference, method, units, and limits explicit.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A delivery planner sees a 24-minute trip estimate. Is the model responding to distance, rush hour, or an unexpected input? A general statement that “distance matters” does not explain this particular estimate.

Explainable Predictions adds an inspectable account of a model output. It should answer a specific question about the computation, help identify mistakes, and state what it cannot establish. An appealing story is insufficient if it does not track the model being used.

## Core idea

Explain **this prediction, under a stated comparison**. One useful approach starts from a reference prediction and assigns input contributions that reconcile with the selected output. These contributions describe how the model allocates the difference under the explanation method’s rules.

A local explanation concerns one case. A global account describes behavior across cases. Neither should be substituted for the other: a feature can be influential overall but contribute little relative to the chosen reference for one input.

Distinguish model behavior from world behavior. Explaining why a computation returns 24 minutes does not prove the trip will take 24 minutes, that the model is fair, or that an attributed input caused the journey’s duration.

## How it works

Identify the actual prediction pipeline, input, and output to explain. State the output’s units: minutes, a class score, probability, or another quantity. For classifiers, contributions in a model’s internal score units cannot automatically be read as percentage-point changes in probability.

Choose an explanation appropriate to the model and the user’s question. A small linear model can expose its terms directly. For complex models, an additive attribution method allocates contributions, while a local surrogate fits a simpler approximation near the selected input. The original [SHAP paper](https://proceedings.neurips.cc/paper_files/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html) develops additive feature attributions; [LIME](https://arxiv.org/abs/1602.04938) instead learns interpretable local approximations. Their assumptions differ.

Specify what absent or varied features mean. A background dataset may supply replacement values; another method may condition on observed inputs. These choices can produce different explanations, particularly when inputs are correlated. [Janzing and colleagues](https://proceedings.mlr.press/v108/janzing20a.html) analyze why observational and interventional notions of feature removal must be distinguished.

Check the explanation against the model. Verify units and reconstruction where applicable, inspect approximation error for a surrogate, and test meaningful input changes. Record model, preprocessing, method, reference data, and sampling settings together. Present the context needed to interpret the result.

## Worked examples

### Explaining a 24-minute estimate

This computed demonstration uses a fictional fixed model, **M1**. It predicts trip duration in **minutes** from distance **d**, measured in **kilometres**, and a rush-hour indicator **r**, equal to **1 during rush hour** and **0 otherwise**:

**Prediction = 10 + 2d + 4r.**

The intercept is 10 minutes, the distance coefficient is 2 minutes per kilometre, and rush hour adds 4 minutes within this model. These teaching coefficients are not fitted values or measured effects.

For a **5 km rush-hour trip**, the prediction is **10 + 2 × 5 + 4 × 1 = 24 minutes**. To explain it, first choose reference trips. Reference **S** contains two fictional trips, **(1 km, off-peak)** and **(3 km, off-peak)**. Their predictions are **12 and 16 minutes**, so the reference prediction is their mean: **(12 + 16) / 2 = 14 minutes**.

The reference’s mean distance is **2 km**, and its mean rush indicator is **0**. For this additive model, replacing missing inputs from the background without conditioning on the retained inputs gives each contribution as **coefficient × difference from reference mean**.

| Component       | Calculation           | Contribution |
| :-------------- | :-------------------- | -----------: |
| Reference       | Mean prediction       |       14 min |
| Distance        | 2 min/km × (5 − 2) km |       +6 min |
| Rush hour       | 4 min × (1 − 0)       |       +4 min |
| Final estimate  | 14 + 6 + 4            |       24 min |

The six-minute distance contribution explains the difference from the reference distance, not the full ten-minute distance term in the prediction formula. The ten-minute intercept is already included in the reference prediction. Adding it again would count it twice.

![A reference prediction of fourteen minutes increases by six attributed minutes for distance and four for rush hour, reconstructing the twenty-four-minute trip estimate.](../assets/machine-learning/explainable-predictions.svg 'Follow the reference through the attributed additions to the final estimate. The contributions reconstruct this model output relative to the chosen reference; they do not measure the real-world causes of the trip’s duration.')

The explorer computes model predictions, averages over the background rows, and calculates exact two-feature Shapley allocations by averaging the increments from both feature-addition orders. This agrees with the linear formula above. The optional inspector exposes all four feature subsets and their values.

[SHAP’s LinearExplainer documentation](https://shap.readthedocs.io/en/latest/generated/shap.LinearExplainer.html) documents the coefficient-times-reference-difference formula for its interventional linear case, and distinguishes correlation-aware explanations. This is a verified documentation example; the explorer is an independent calculation and does not call the SHAP library. Here “interventional” means replacing model inputs, not identifying a real-world causal effect.

```patternverse-widget
{
  "src": "ml-explainable-predictions.html",
  "title": "Prediction attribution and reference explorer",
  "height": 1200,
  "fallback": "For a fictional 5 km rush-hour trip, the fixed model predicts 24 minutes. Relative to two short off-peak reference trips, the mean prediction is 14 minutes; distance contributes +6 and rush hour +4. A mixed reference changes the baseline to 20 and contributions to +2 and +2, while the prediction stays 24. These are exact model calculations, not measured trip times or causal effects."
}
```

### Changing the reference changes the explanation

Reference **M** contains **(3 km, off-peak)** and **(5 km, rush hour)**. The model predicts **16 and 24 minutes**, averaging **20**. Mean distance is **4 km**, and mean rush indicator is **0.5**, meaning one of the two reference trips occurs during rush hour.

For the same 5 km rush-hour trip, distance now contributes **2 × (5 − 4) = 2 minutes**, and rush hour contributes **4 × (1 − 0.5) = 2 minutes**. The reconstruction becomes **20 + 2 + 2 = 24**.

The prediction has not changed. The comparison has. Both two-row references are deliberately small teaching backgrounds, not population estimates. Choose a reference that fits the question and expose its limitations. A reference change can also reverse a contribution’s sign: a 1 km off-peak trip has contributions **−6 and −2 minutes** relative to M, giving **20 − 6 − 2 = 12**.

### A model change is not an established intervention effect

Keeping distance at 5 km but setting the rush indicator to zero changes M1’s output from **24 to 20 minutes**. That is an exact four-minute change in this model’s computation.

It does not demonstrate that postponing departure saves four actual minutes. Departure time could change traffic, route choice, or other omitted factors. A feasible recommendation and a causal estimate require evidence beyond this attribution. Likewise, a large distance contribution does not imply that distance is an actionable variable for this journey.

## Assumptions for correctness

The explainer must operate on the deployed model and preprocessing, with correct feature meanings and output units. The explanation’s replacement or conditioning rule and reference data must match the claim being made. Unrealistic input combinations can undermine the usefulness of perturbation-based explanations.

Exact additive reconstruction is only an accounting check. It does not establish that the reference is appropriate, inputs are independent, the model is accurate, or the allocation is uniquely meaningful across different explanation questions.

## When to use it

Use prediction explanations when reviewers need to inspect individual outputs, investigate suspicious input dependencies, or communicate a model’s computational basis. Agree on who will use the explanation and what decision it supports.

For straightforward models, expose readable terms before adding an approximation layer. If the question concerns typical behavior, evaluate explanations across a suitable sample rather than selecting a few persuasive examples.

## Tradeoffs and operating costs

Explaining complex models can require many additional evaluations, background storage, approximation settings, and monitoring. References and explainers need versioning alongside model releases. Changes in explanations may reflect changed inputs, model behavior, or explanation configuration; these require different investigations.

Balance detail with the reader’s task. A concise display can link to calculations and reference definitions without presenting every internal feature as a useful human concept.

## Common mistakes and limitations

Do not label attributions as causes, confidence, or proof of fairness. Do not treat a plausible narrative generated after the prediction as evidence that it reflects the actual computation. Grouped, derived, or correlated features need particular care when assigning credit.

Visual appeal is not validation. [Adebayo and colleagues](https://arxiv.org/abs/1810.03292) showed that some tested saliency methods could be insensitive to model or data randomization. Their result motivates method-appropriate checks; it does not establish that every attribution method fails or that every randomized-model comparison is sufficient validation.

## Related patterns

[[ml-behavioral-testing|Behavioral Testing]] checks specified responses to meaningful input changes; explanations help inspect a response’s allocation. [[ml-slice-based-evaluation|Slice-Based Evaluation]] measures performance across groups rather than explaining one output. [[ml-probability-calibration|Probability Calibration]] concerns probability reliability, which attribution does not establish. [[ml-model-cards|Model Cards]] carries release-level evidence and limitations, including an explanation method’s scope.

## Sources and further reading

- [Lundberg and Lee: A Unified Approach to Interpreting Model Predictions](https://proceedings.neurips.cc/paper_files/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html) — additive feature attribution and SHAP.
- [SHAP: LinearExplainer](https://shap.readthedocs.io/en/latest/generated/shap.LinearExplainer.html) — linear formulas, background masking, and correlation handling.
- [Ribeiro, Singh, and Guestrin: “Why Should I Trust You?”](https://arxiv.org/abs/1602.04938) — local surrogate explanations with LIME.
- [Janzing, Minorics, and Bloebaum: Feature relevance quantification in explainable AI](https://proceedings.mlr.press/v108/janzing20a.html) — different notions of feature removal.
- [Adebayo and colleagues: Sanity Checks for Saliency Maps](https://arxiv.org/abs/1810.03292) — testing explanations beyond visual assessment.
