---
id: ml-model-versioning
type: pattern
title: 'Model Versioning'
summary: 'Give each prediction release a stable identity that binds model weights to compatible transforms, decision rules, runtime requirements, and supporting evidence.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A delivery service rolls back yesterday's model after complaints about its arrival estimates. The team restores the old weights, but predictions still differ from last week's. A new distance normalizer remains active, and the threshold for manual review changed too. The filename says “old model”; the running system is a combination nobody evaluated.

Model Versioning makes a release identifiable and recoverable. It answers which components produced a prediction, which evidence justified deploying them, and what must be restored together.

## Core idea

Give each release a stable identity and a **manifest**: a record binding that identity to exact artifacts and configuration. Artifacts are saved objects such as weights, fitted preprocessing state, or a runtime image. The manifest can reference separately stored objects; it need not duplicate them.

Keep identity separate from deployment selection. Release R1 always refers to the same declared contents. An alias such as `champion` means “the release currently selected for this role” and can move from R1 to R2. A prediction log needs the resolved release identity, not just the alias.

## How it works

Define the release boundary around everything needed to interpret and execute the prediction. Include weights, preprocessing and feature order, input/output contracts, decision thresholds, inference code, and runtime dependencies. For a retrieval system, also identify the relevant index snapshot and retrieval configuration. Record external dependencies whose changing state remains outside the bundle.

Link the manifest to its training run, code revision, data snapshot or reconstructable data reference, and evaluation report. These links explain origin and evidence; they are different from the inference artifacts themselves. The [MLflow registry overview](https://mlflow.org/docs/latest/ml/model-registry/) documents model versions, run lineage, aliases, and annotations as registry capabilities.

Prevent released contents from being overwritten. Verify stored bytes against trusted content hashes where appropriate, and retain the referenced objects. A hash is a content fingerprint; a version name alone does not establish byte identity. [Docker's digest documentation](https://docs.docker.com/dhi/explore/security-concepts/digests/) illustrates this distinction for runtime images: tags can change, while a digest identifies particular image content.

Before deployment, load the complete release and run compatibility and representative prediction checks. Resolve aliases once when loading a release, then log what each worker actually loaded. Record deployment events separately: moving an alias does not instantly replace objects already held by running workers. Rollback selects a retained, compatible release and checks that it can still operate against current inputs.

## Worked examples

### Restoring weights leaves a mixed release

Everything numerical here is fictional and computed for explanation. Release R1 predicts delivery duration from distance. Its transform T1 subtracts **10 kilometres** and divides by **10 kilometres**, producing a dimensionless normalized distance, **z**. Weights W1 calculate duration as **20 + 5 × z minutes**. Rule P1 sends estimates of **at least 30 minutes** to manual review.

For a **30 km** request, T1 gives **z = (30 − 10)/10 = 2**. W1 then gives **20 + 5 × 2 = 30 minutes**, triggering review under P1.

The currently deployed release R2 uses T2, which subtracts **20 km** and divides by **10 km**; W2 predicts **24 + 4 × z minutes**; P2 reviews estimates of at least **32 minutes**. R2 predicts **28 minutes** for that request.

Restore only W1, leaving T2 and P2 active. Now **z = (30 − 20)/10 = 1**, so W1 predicts **25 minutes**, with no review. This is **5 minutes below R1's recorded result**, despite using its weights. Restoring all three components recovers R1's 30-minute result and review decision in this deterministic example.

![An identical 30 kilometre request passes through complete release R1 and a weights-only restoration. Different transforms produce normalized distances two and one, leading to estimates of thirty and twenty-five minutes.](../assets/machine-learning/model-versioning.svg 'Follow the transform, weights, and review rule as one chain. Restoring W1 alone leaves two R2 components in place; restoring the complete R1 manifest recovers both its estimate and its review decision. These are computed teaching values, not measured delivery performance.')

The explorer executes the formulas and selects components from two manifests. Change the requested release, restore scope, or distance. It compares the assembled components with the requested manifest as well as comparing outputs: matching one prediction does not establish release identity.

```patternverse-widget
{
  "src": "ml-model-versioning.html",
  "title": "Complete and partial model release restoration explorer",
  "height": 1200,
  "fallback": "At 30 km, complete R1 uses T1 + W1 + P1 and predicts 30 minutes with review. Restoring W1 alone into R2 uses T2 + W1 + P2 and predicts 25 minutes without review: a five-minute difference."
}
```

### The estimate matches, but the action changes

Restore T1 and W1 while retaining P2. The same request again produces **30 minutes**, but the 32-minute threshold prevents review. Checking only the numerical prediction would miss this difference.

For requests at **10, 20, and 30 km**, T1 and W1 produce **20, 25, and 30 minutes**. P1 reviews **one of three** requests; P2 reviews **none**. Those counts describe this three-request fixture, not an estimated production review rate. A threshold change can deserve its own release even when no weights change.

### A registry alias moves while historical identity stays fixed

A fictional support log records request A with release R1. Later, the team moves `champion` to R2. Looking up today's alias cannot establish what served A. Logging R1 and its manifest reference preserves that distinction; logging only `champion` loses it unless a separate, complete deployment history reconstructs the resolution.

As a verified implementation counterpart, [MLflow's registry workflow](https://mlflow.org/docs/latest/ml/model-registry/workflow/) documents loading a particular model version and loading whichever version currently has an alias. Its example reassigns an alias between versions. This is documented API behavior, not a production deployment reproduced by the explorer. A model registry entry still needs references to all dependencies required by your release boundary.

## Assumptions for correctness

The manifest must describe what actually ran, and its references must remain available and trustworthy. Mutable paths, deleted artifacts, or logs written from an intended configuration rather than the loaded configuration break traceability.

Runtime compatibility also matters. [Scikit-learn's persistence guide](https://scikit-learn.org/stable/model_persistence.html) warns against loading persisted estimators across different scikit-learn versions and recommends retaining training-data references, source code, dependency versions, and evaluation information. Loading untrusted pickle-based artifacts can execute code; matching a hash does not make an untrusted artifact safe.

## When to use it

Use versioning when comparing experiments, releasing batch or online predictions, investigating incidents, or handing models between teams. A small project can start with immutable artifact storage and a manifest file. A registry becomes useful as discovery, permissions, promotion, and concurrent releases become harder to coordinate.

## Tradeoffs and operating costs

Retention consumes storage and requires ownership, access controls, and deletion policies. Reusing content-addressed artifacts can reduce duplication, but shared objects need reference-aware cleanup. Keep release approval and deployment history alongside artifact identity so operators can distinguish “stored,” “evaluated,” and “serving.”

Historical replay may require sensitive inputs or data snapshots. Retain only what is justified, and state when deletion or unavailable dependencies prevents exact replay. Do not claim recoverability beyond the evidence retained.

## Common mistakes and limitations

A code revision does not identify trained weights or training data. Increasing a version number does not demonstrate improvement. An immutable bundle does not guarantee useful, fair, calibrated, or safe predictions.

Restoring artifacts differs from retraining identical weights. Randomness, hardware, libraries, and changing data can affect reproduction. Even an exact runtime image cannot freeze external feature services. Likewise, versioning cannot undo actions already taken, and an old release may be incompatible with today's schema. Test rollback readiness rather than treating an archive as a recovery plan.

## Related patterns

[[ml-batch-serving|Batch Serving]] publishes prediction sets whose run identities retain the model and input artifacts behind each answer. [[ml-checkpoints|Checkpoints]] preserves progress inside a training run; release versioning identifies the compatible artifacts selected for serving. [[ml-workflow-pipeline|Workflow Pipeline]] coordinates the steps that produce and assess a release. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] establishes compatible feature production; versioning identifies the compatible pieces. [[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] controls exposure and recovery; versioning supplies explicit release targets. [[ml-continuous-model-evaluation|Continuous Model Evaluation]] tracks outcomes by deployed identity. [[ml-model-cards|Model Cards]] explain a release's evidence, intended uses, and limitations rather than storing its executable contents.

## Sources and further reading

- [MLflow: Model Registry](https://mlflow.org/docs/latest/ml/model-registry/) — versions, lineage, aliases, and annotations.
- [MLflow: registry workflows](https://mlflow.org/docs/latest/ml/model-registry/workflow/) — loading explicit versions and reassigning aliases.
- [Docker: image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/) — content identity versus movable tags.
- [Scikit-learn: model persistence](https://scikit-learn.org/stable/model_persistence.html) — compatibility, retained evidence, and loading risks.
