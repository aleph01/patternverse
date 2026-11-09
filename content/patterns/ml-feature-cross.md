---
id: ml-feature-cross
type: pattern
title: 'Feature Cross'
summary: 'Represent a combination of input values explicitly so a model can learn a response to the combination beyond the separate effects of its parts.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A travel-time model uses vehicle type and weather. Rain adds considerable time to a bike trip but much less to a car trip. A linear predictor with separate vehicle and weather indicators assigns one rain adjustment to every vehicle. Changing that adjustment improves one group while worsening another.

Feature Cross makes the combination available as its own input. It lets the model express “wet weather when travelling by car,” rather than relying entirely on independent vehicle and weather effects.

## Core idea

Create a feature that identifies a **joint condition**. Crossing vehicle {bike, car} with weather {dry, wet} gives four possible pairs: bike–dry, bike–wet, car–dry, and car–wet. A one-hot representation assigns one position to each pair and activates the matching position.

The cross supplies a distinction; training must learn whether it matters. It does not discover a useful coefficient merely by naming a combination. Google's [feature-cross guide](https://developers.google.com/machine-learning/crash-course/categorical-data/feature-crosses) explains categorical crossings and their use in linear models.

## How it works

Choose inputs whose joint behavior is plausible for the task. Define normalization, category vocabularies, missing values, and unknown-category handling. Preserve field identity and order when constructing pair keys. An unambiguous tuple such as `[vehicle=car, weather=wet]` avoids confusing values from different fields or ambiguous string concatenations.

Encode the joint category directly, hash it into a bounded representation, or add selected interaction indicators alongside the original features. Retaining original features can supply shared behavior when individual combinations have little evidence. Fit the resulting model and compare it with an otherwise comparable uncrossed baseline on relevant held-out data.

With binary category indicators, multiplication can express a joint condition: “car” times “wet” is one only when both hold. Multiplying arbitrary category ID numbers does not have this meaning. [Scikit-learn's PolynomialFeatures](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PolynomialFeatures.html) can construct products of distinct input columns with `interaction_only=True`; the downstream estimator learns their coefficients.

### Optional: full pairs versus reference coding

Four joint categories do not always require four additional coefficients. With bike and dry as reference categories, an intercept, a car indicator, a wet indicator, and their product can represent the four cell means. This avoids adding a redundant set of full pair indicators to the same intercept and main effects. The example uses this reference coding.

## Worked examples

### The weather effect depends on the vehicle

These four fictional trip durations, in **minutes**, isolate the mechanism. Each cell has equal weight; there are no repeated trips or noisy measurements.

| Vehicle | Dry | Wet |
| :------ | --: | --: |
| Bike    |  20 |  40 |
| Car     |  30 |  35 |

Wet weather changes the bike duration by **40 − 20 = 20 minutes**, but the car duration by **35 − 30 = 5 minutes**. Their difference is **5 − 20 = −15 minutes**. One shared wet-weather coefficient cannot reproduce both changes exactly.

Let **c = 1 for car**, otherwise zero, and **w = 1 for wet**, otherwise zero. Their product **c × w** is also dimensionless. A fitted crossed predictor for these cells is **duration = 20 + 10c + 20w − 15cw minutes**. For car–wet, it gives **20 + 10 + 20 − 15 = 35 minutes**. For bike–wet, c is zero, so it gives **20 + 20 = 40 minutes**. The coefficients are learned from this synthetic table, not prescribed by crossing alone.

For comparison, fitting only an intercept and separate indicators to all four cells by ordinary least squares gives **23.75 + 2.5c + 12.5w minutes**. Least squares minimizes the sum of squared differences from the supplied durations. The wet-weather change is now **12.5 minutes for both vehicles**. For car–wet, this fit predicts **38.75**, missing 35 by **3.75 minutes**.

![Two fitted two-by-two tables compare separate vehicle and weather indicators with an added car–wet product. The separate fit uses the same twelve-and-a-half-minute weather adjustment for both vehicles; the crossed fit represents twenty minutes for bikes and five for cars.](../assets/machine-learning/feature-cross.svg 'Compare the dry-to-wet change within each vehicle row. Separate indicators force one shared weather adjustment. The cross permits different adjustments, fitting these four supplied cells exactly; that fit supplies no evidence about unseen trips.')

The explorer fits both models from the available synthetic cells. Change the underlying interaction, hide the car–wet cell from training, or inspect a different pair. It calculates coefficients, predictions, and errors. Its default zero training error with a cross is a four-parameter fit to four cells, not a measured generalization gain.

```patternverse-widget
{
  "src": "ml-feature-cross.html",
  "title": "Feature cross interaction and unseen-pair explorer",
  "height": 1200,
  "fallback": "For fictional durations 20, 40, 30 and 35 minutes, separate indicators impose a shared 12.5-minute wet-weather adjustment. Adding car × wet permits adjustments of 20 and 5 minutes. With car–wet withheld, its interaction coefficient cannot be learned from the remaining three cells."
}
```

### An unseen pair has no learned pair-specific evidence

Remove car–wet from training. The remaining cells establish a **20-minute** baseline, a **10-minute** car adjustment, and a **20-minute** wet adjustment. The product c × w is zero in every training row, so those rows provide no information about its coefficient.

The explorer explicitly sets that unidentified coefficient to zero. Both models then predict **20 + 10 + 20 = 50 minutes** for car–wet. Its reserved synthetic target remains 35, giving a held-out absolute error of **15 minutes**. Both models fit the three training cells exactly. The held-out target never participates in fitting.

This zero-interaction fallback is a stated teaching policy, not a universal solver default. A production system might regularize, share parameters, use an unknown-pair representation, or defer. Each choice needs evaluation; storing a pair key does not create observations for it.

### Many useful pairs can become expensive

Suppose a fictional catalog has **1,000 merchant categories** and **100 product categories**. Their full cross contains **1,000 × 100 = 100,000 possible positions**. A single-valued request activates one pair position, so sparse storage need not allocate a dense vector for every request. Model parameters and the evidence needed for individual pairs can still grow substantially.

[Keras HashedCrossing](https://www.tensorflow.org/api_docs/python/tf/keras/layers/HashedCrossing) documents crossing inputs into a fixed number of bins. Hashing bounds representation width but lets different pairs collide; it does not supply statistical sharing based on similarity. The explorer uses exact indicators and performs no hashing.

A verified historical implementation is the **2016 Wide & Deep paper**, which reports a Google Play recommender combining explicit cross-product features in its wide component with learned representations in a deep component. Its [published evidence](https://arxiv.org/abs/1606.07792) concerns that system; this small regression demonstration reproduces neither its deployment nor its results.

## Assumptions for correctness

Both source features must be available at prediction time, with consistent encoding across training and serving. The joint feature must preserve the intended combination rather than combine identifiers through accidental arithmetic.

Training coverage must support the interactions being estimated. A well-supported main effect does not imply that every associated pair is supported. Check important slices and cold-start combinations, and keep evaluation outcomes outside feature selection and fitting.

## When to use it

Use a cross when domain knowledge or residual analysis suggests that one input's effect depends on another, especially with an additive linear baseline. Categorical geography–product or device–context combinations are plausible candidates, not automatic improvements.

Trees and neural networks can already represent interactions. Explicit crosses may still help, but compare them against the model's existing capacity and operating cost.

## Tradeoffs and operating costs

Crosses increase vocabulary, parameters, computation, and monitoring responsibilities. Rare combinations can overfit, and higher-order crosses multiply the number of possible combinations again. Regularization limits fitted effects but cannot establish evidence for an unseen condition.

Maintain reproducible category mappings and representative parity tests. Hashing reduces width while making individual pair effects harder to inspect. Evaluate resource use and predictive value together.

## Common mistakes and limitations

Do not cross every available field, multiply arbitrary categorical IDs, or interpret a fitted interaction as a causal effect. A predictive association can reflect exposure, selection, or confounding.

Avoid judging a saturated fit by training error alone. Unseen pairs, distribution shifts, and drifting category meanings remain problems. A cross changes the representation; it does not correct leakage, unreliable labels, or a flawed evaluation design.

## Related patterns

[[ml-hashed-feature|Hashed Feature]] bounds the representation of joint keys while accepting collisions. [[ml-embedding|Embedding]] learns compact representations that can support parameter sharing; a plain pair indicator instead gives a combination its own identifiable position. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] preserves the crossing contract. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks whether gains and failures concentrate in particular combinations.

## Sources and further reading

- [Google ML Crash Course: feature crosses](https://developers.google.com/machine-learning/crash-course/categorical-data/feature-crosses) — categorical products, linear models, and sparsity.
- [Scikit-learn: PolynomialFeatures](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PolynomialFeatures.html) — product-column construction and interaction-only expansion.
- [Keras: HashedCrossing](https://www.tensorflow.org/api_docs/python/tf/keras/layers/HashedCrossing) — bounded hashed crossings and output encodings.
- [Cheng and colleagues: Wide & Deep Learning for Recommender Systems](https://arxiv.org/abs/1606.07792) — explicit interactions combined with learned representations in a deployed recommender.
