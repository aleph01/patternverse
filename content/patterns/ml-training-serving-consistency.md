---
id: ml-training-serving-consistency
type: pattern
title: 'Training-Serving Consistency / Transform'
summary: 'Reuse compatible preprocessing rules and fitted transform state across training and prediction, releasing them with the model that expects their outputs.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A delivery classifier performs well offline, but its live predictions change after an engineer rewrites normalization in the request handler. Both versions subtract a mean and divide by a standard deviation. The offline version uses statistics fitted during training; the handler recomputes them from incoming requests. The formulas look alike, but the model receives different features.

Training-Serving Consistency keeps the meaning and production of those features aligned. “Transform” emphasizes a reusable preprocessing artifact: the operations together with any learned state they need.

## Core idea

Separate **fitting a transform** from **applying it**. Fitting estimates quantities such as means, imputation values, or vocabulary mappings from permitted training data. Applying uses that saved state to convert another input into the feature representation expected by the model.

Reuse both the rules and their state. Calling the same function while loading a different vocabulary is insufficient. Copying a formula into another language is also insufficient if parsing, defaults, ordering, or numerical behavior differ.

A consistent pipeline can still be wrong. Agreement between paths establishes compatibility for checked inputs, not useful predictions or freedom from leakage.

## How it works

Define the raw input contract, including units, missing values, categories, timestamps, and feature order. Split data before fitting learned preprocessing. In cross-validation, fit it within each training fold; apply the resulting state to that fold's validation data. Scikit-learn's [common-pitfalls guide](https://scikit-learn.org/stable/common_pitfalls.html) demonstrates inconsistent preprocessing and explains why fitting on test data leaks information.

Save the preprocessing definition, fitted state, and model as a compatible release. Either include preprocessing in the executable model or use a separately versioned component with an explicit interface. Ensure a transformed feature is not transformed again when it enters the next component.

Compare offline and serving paths on the same raw records. Inspect intermediate feature names, positions, values, missingness, and final outputs. Include unseen categories and malformed or absent fields. Use exact comparisons for discrete mappings and justified tolerances for floating-point calculations.

[TensorFlow Transform](https://www.tensorflow.org/tfx/transform/get_started) documents separating dataset analysis from per-row transformation, representing the result as a graph that can be incorporated into serving. This is one implementation approach, not a requirement to adopt TensorFlow for the pattern.

## Worked examples

### The same formula, different fitted state

Use four fictional training deliveries with distances **0, 0, 20, 20 kilometres**. Their mean is **10 km**. Subtracting ten gives **−10, −10, +10, +10 km**. Average the squared deviations: **(100 + 100 + 100 + 100)/4 = 100 km²**. Its square root is a standard deviation of **10 km**.

Save those values in transform T1. Standardization computes **z = (distance − 10)/10**, so z is dimensionless. This uses the population convention, dividing by four, matching the convention documented for [StandardScaler](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html).

The transform also preserves the category mapping **standard → slot 0**, **express → slot 1**, with a reserved unknown slot. Its output order is **[z, standard-slot indicator, express-slot indicator, unknown indicator]**. Each indicator is one when its slot is selected and zero otherwise.

For an express request at **20 km**, the saved transform produces **[1, 0, 1, 0]**. The fictional model uses fixed score **s = z + 2 × express-slot indicator − unknown indicator − 2**. These coefficients are chosen for explanation, not trained here. Convert s to a model probability with **p = 1/(1 + exp(−s))**. Here s = 1, giving **p ≈ 0.731**.

Now refit numeric statistics on a live batch containing distances **20 and 40 km**. Its mean is 30 km and its standard deviation is 10 km. The identical request becomes **[(20 − 30)/10, 0, 1, 0] = [−1, 0, 1, 0]**. The unchanged model now gives s = −1 and **p ≈ 0.269**. A decision threshold of 0.5 changes the answer solely because preprocessing changed.

![The same express delivery travels through a saved training transform and a live-batch refit. The first produces normalized distance one and model probability 0.731; the refit produces minus one and probability 0.269.](../assets/machine-learning/training-serving-consistency.svg 'Follow the identical raw request through both paths. Different fitted means change the normalized feature before it reaches the same model. Reusing T1 restores this example’s feature parity; it does not establish predictive accuracy.')

The explorer fits T1 from the four training records, executes both paths, and compares their vectors and outputs. Serving options reuse T1, refit numeric state, reverse the category mapping, or normalize twice. All values are computed; no production classifier or accuracy experiment is reproduced.

```patternverse-widget
{
  "src": "ml-training-serving-consistency.html",
  "title": "Training and serving transform parity explorer",
  "height": 1200,
  "fallback": "For the same 20 km express request, saved transform T1 gives [1, 0, 1, 0] and model p 0.731. Refitting on a live batch of 20 and 40 km gives [−1, 0, 1, 0] and p 0.269. Reusing the saved artifact restores feature parity."
}
```

### A vocabulary change silently changes meaning

Keep the numeric transform, but let serving assign express to slot zero and standard to slot one. The express request becomes **[1, 1, 0, 0]**. The model still interprets slot one as express, so its score is again −1 rather than +1. The vector has the correct length and numeric types; its positions have the wrong meaning.

Preserve the mapping and feature order with the model. [Keras StringLookup](https://www.tensorflow.org/api_docs/python/tf/keras/layers/StringLookup) documents vocabulary-based lookup and configurable out-of-vocabulary behavior. The explorer uses its own stated slot layout, not that layer's default index convention.

### Missing and unfamiliar inputs need declared policies

For a missing express distance, T1 imputes its saved training mean, **10 km**, then produces z = 0. For a 20 km request with service `drone`, it selects the reserved unknown slot, producing **[1, 0, 0, 1]**. These are explicit teaching policies. Matching on them does not mean that mean imputation or one unknown category is appropriate for every application.

An implementation counterpart is the [TFX Transform component](https://www.tensorflow.org/tfx/api_docs/python/tfx/v1/components/Transform), which produces transformed examples and a transform graph for downstream use. Pairing compatible artifacts still requires correct pipeline integration; exporting a graph alone does not prove that a live endpoint invokes it.

## Assumptions for correctness

Both paths must receive semantically equivalent raw inputs. Kilometres and metres, stale and current snapshots, or differently defined time windows are not equivalent merely because they share a field name. Shared code cannot repair upstream differences it never observes.

Fitted state must come from permitted data and stay compatible with the model. Check precision, operation order, and runtime behavior where implementations differ. A passing finite fixture suite supplies evidence, not proof of equivalence for every possible input.

## When to use it

Use this pattern whenever offline preparation and online prediction share learned preprocessing, especially across different services, languages, batch systems, or deployment teams. It also applies to entirely offline batch prediction.

Stateless transforms still need matching semantics, but may require no fitted state. Intentionally adaptive preprocessing needs a designed training and evaluation procedure; accidental live-batch refitting is not such a procedure.

## Tradeoffs and operating costs

Bundled preprocessing simplifies compatibility but may increase model size, runtime requirements, or latency. Separate components offer flexibility while adding version coordination and failure boundaries. Retain compatible releases so rollback restores the transform and model together.

Maintain representative parity fixtures and serving diagnostics. Logging transformed features can reveal sensitive information, so collect only what the operating investigation needs.

## Common mistakes and limitations

Do not refit scalers on evaluation or live requests, rebuild category IDs independently, apply normalization twice, or release a new transform under old model weights without evaluation. Matching scores alone can conceal different intermediate vectors.

Consistency does not establish calibration, fairness, valid labels, or resistance to distribution shift. Data can drift while preprocessing remains perfectly consistent. Conversely, two paths may match on one request despite incompatible state; broaden the evidence and inspect artifact identity too.

## Related patterns

[[ml-feature-store|Feature Store]] coordinates shared features and their retrieval paths, including freshness and compatible definitions. [[ml-workflow-pipeline|Workflow Pipeline]] coordinates preparation, training, and checks through declared artifact dependencies. [[ml-model-versioning|Model Versioning]] identifies the compatible artifacts and configuration to retain and restore together. [[ml-schema-based-data-validation|Schema-Based Data Validation]] checks input structure and constraints; compatible transformations additionally preserve meaning. [[ml-point-in-time-feature-retrieval|Point-in-Time Feature Retrieval]] reconstructs what was available at a historical decision. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] limits information used in fitting. [[ml-hashed-feature|Hashed Feature]] requires shared hashing and normalization rules, while [[ml-embedding|Embedding]] requires compatible vocabulary and parameter versions.

## Sources and further reading

- [Scikit-learn: common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) — inconsistent preprocessing, pipelines, and fitting boundaries.
- [Scikit-learn: StandardScaler](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html) — saved statistics and population-variance convention.
- [TensorFlow Transform: getting started](https://www.tensorflow.org/tfx/transform/get_started) — analysis, reusable transformations, and serving graphs.
- [TFX: Transform component](https://www.tensorflow.org/tfx/api_docs/python/tfx/v1/components/Transform) — transformed examples and the transform graph artifact.
- [Keras: StringLookup](https://www.tensorflow.org/api_docs/python/tf/keras/layers/StringLookup) — vocabulary and out-of-vocabulary configuration.
