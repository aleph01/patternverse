---
id: ml-schema-based-data-validation
type: pattern
title: 'Schema-Based Data Validation'
summary: 'Express the expected structure and constraints of model inputs as a versioned contract, check incoming data against it, and make violations actionable before they propagate.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

Yesterday's delivery model trained successfully. Today, an upstream export writes distance as the string `"12"`, introduces a new service category, and omits some labels. The training job may crash, coerce values silently, or continue with a changed interpretation of its inputs. A successful run would not tell you which happened.

Schema-Based Data Validation makes those expectations explicit before data reaches a model. Instead of discovering an upstream change through a puzzling accuracy drop, the pipeline produces a specific finding: which field violated which rule, in which batch, under which contract version.

## Core idea

Treat the input boundary as a **checkable contract**. A schema describes expected fields, types, shapes, requiredness, and allowed values. Validation compares records or dataset statistics with that description. An explicit policy then decides whether to hold a batch, isolate affected records, or raise a warning.

Passing means **the implemented checks found no violation**. It does not certify correct labels, meaningful units, a representative population, or good predictions. The contract can encode domain knowledge, but it cannot infer knowledge that nobody supplied.

The [MLSys paper Data Validation for Machine Learning](https://proceedings.mlsys.org/paper_files/paper/2019/hash/928f1160e52192e3e0017fb63ab65391-Abstract.html) describes a production validation system within Google's TFX platform. Its evidence concerns that implementation; the delivery records below are fictional teaching data.

## How it works

Begin with what a particular consumer actually needs. Define scalar or list types, required fields, permitted categories, numeric bounds, and the handling of extra fields. Specify whether missing and null are different, whether parsing can change types, and where validation occurs relative to preprocessing. A raw record and an encoded feature vector need different contracts.

Review an inferred schema rather than treating observed data as unquestionable truth. An inferred range may describe a quiet week rather than all valid operations. [TFX SchemaGen](https://www.tensorflow.org/tfx/guide/schemagen) proposes a schema from statistics and documents reviewing and importing the edited version for continued use.

Run checks at ingestion, training-data creation, evaluation, and serving boundaries as appropriate. Preserve the contract version, data identifier, findings, and any explicit conversions. Assign ownership and a response to each violation. Producing a report and stopping a downstream job are separate responsibilities.

Separate record rules from batch rules. “Every pickup hour is an integer from 0 through 23” checks individual values. “At least 99% of records contain a feature” needs a batch denominator. Cross-field consistency, uniqueness, and freshness require additional checks supported by the chosen validator; they are not implied by declaring column types.

## Worked examples

### Six records, five affected rows

A fictional delay classifier consumes `distance_km`, `service`, and `pickup_hour`. During training it also requires `delivered_late`, an integer label in {0, 1}. Contract v1 requires a finite numeric distance in **[0, 200]**, service in **{standard, express}**, and an integer pickup hour in **[0, 23]**. No extra feature fields are allowed.

| Row | distance_km | service  | pickup_hour | delivered_late |
| --- | ----------: | :------- | ----------: | -------------: |
| D01 |          12 | standard |           9 |              0 |
| D02 |      `"12"` | express  |          14 |              1 |
| D03 |          −3 | standard |          10 |              0 |
| D04 |          22 | drone    |          16 |              1 |
| D05 |        null | express  |          24 |              0 |
| D06 |           5 | standard |          11 |         absent |

Under strict validation, only **D01 passes**. D02 has the wrong distance type; D03 violates the distance bound; D04 introduces an unapproved category; D05 has a null distance and an invalid hour; D06 lacks its label. That is **five flagged rows and six violations**. A type failure stops further checks on that field, so null produces one type violation rather than several cascading range failures.

![Six delivery records are checked against contract v1 in training mode. One row passes, five are flagged, and six violations hold the whole batch. Passing rows are not automatically released.](../assets/machine-learning/schema-based-data-validation.svg 'Count affected rows separately from individual violations: D05 breaks two field rules. The selected response holds the whole batch; passing rows are not silently released for training.')

The explorer executes these checks and lists exact failures. Its optional decimal-string conversion changes D02's distance to numeric 12 while retaining the raw value and recording the conversion. Then **two rows pass, four are flagged, and five violations remain**. This is an explicit parsing policy, not evidence that silent coercion is generally safe.

```patternverse-widget
{
  "src": "ml-schema-based-data-validation.html",
  "title": "Schema validation contract explorer",
  "height": 1200,
  "fallback": "Training contract v1 flags five of six fictional rows, with six violations. Explicit parsing repairs one type mismatch. A schema-valid batch can still carry the wrong units."
}
```

### Training and serving need compatible contracts

A prediction request has no observed `delivered_late` yet. Remove all labels from the six records and apply the training contract: now every row is flagged, with **eleven violations**, including six missing labels. Apply the serving contract instead: **two rows pass**, and the remaining **five violations** concern distance, service, and hour.

The explorer deliberately forbids labels in serving feature objects. This is its chosen policy, not a universal rule of schema libraries. [TFDV's environment mechanism](https://www.tensorflow.org/tfx/data_validation/get_started) supports expressing expected differences such as a training label absent during serving. Shared input features still need compatible meaning and transformations.

Suppose `drone` is a legitimate service launch. Contract v2 permits it, making D04 pass in the original training batch. Combined with decimal conversion, **three rows pass and four violations remain**. Updating the schema does not update the encoder's vocabulary or teach the trained model how drone deliveries behave. Release the compatible pipeline changes together.

### A valid number can carry the wrong unit

Another fictional batch contains numeric distances **12, 18, 22, 8, 5, 30**, with valid hours, service categories, and training labels. All six pass the stated contract. But the producer has switched to metres while the consumer still interprets kilometres.

The first distance should be **0.012 km**, not 12 km: a thousandfold interpretation error. Every number lies within [0, 200], so that range cannot reveal the mistake. The explorer's unit scenario exposes this blind spot; it does not pretend to detect units from magnitude alone. A versioned unit declaration, a verified conversion, and producer–consumer agreement can make the expectation checkable.

A verified implementation illustrates another boundary: [TFX ExampleValidator](https://www.tensorflow.org/tfx/guide/exampleval) consumes statistics and a schema and emits validation results. It supports anomaly checks beyond bare types, including configured comparisons for skew or drift. Those comparisons require their own references and thresholds; this explorer performs neither.

## Assumptions for correctness

The schema must match the intended consumer and data stage. Required fields, ranges, units, category policies, and exceptions need domain review. The validator must actually execute the rules on the data being consumed, with correct null, numeric, and parsing semantics.

Check library defaults. In [JSON Schema's object rules](https://json-schema.org/understanding-json-schema/reference/object), declaring properties alone neither requires them nor forbids additional properties. Requiredness and extra-field handling need separate declarations. The explorer uses original teaching code, not a complete JSON Schema implementation.

## When to use it

Use this pattern when multiple producers feed an ML pipeline, periodic retraining consumes changing exports, or a serving API needs a stable feature interface. It is especially useful where silent coercion or permissive storage can hide upstream changes.

Use it alongside behavioral and statistical evaluation when the main concern is predictive usefulness. A structurally conforming dataset may still be entirely unsuitable for a task.

## Tradeoffs and operating costs

Rules require maintenance as products, populations, and feature definitions evolve. Overly tight bounds create false alarms and may exclude legitimate cases. Broad rules reduce friction but miss important errors.

Full scans cost computation; sampling and summaries can miss rare failures. Quarantine and batch holds require recovery, investigation, and replay procedures. Monitor flagged rates by source or slice: removing invalid rows can alter the training population rather than simply clean it.

## Common mistakes and limitations

Do not infer a new schema from each incoming batch and validate that batch only against its own description. This can normalize an upstream defect into an accepted contract.

Do not silently drop every failing row, broaden every category list, or substitute defaults without investigating the cause. Validation does not itself repair data. Correct types do not prevent label leakage, duplicated entities across evaluation splits, stale values, or label errors. Distribution drift can occur while every record remains schema-valid.

## Related patterns

[[ml-drift-detection|Drift Detection]] compares populations over time; records can satisfy a schema while their distribution changes. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] controls information and split boundaries; schema checks alone cannot establish them. [[ml-behavioral-testing|Behavioral Testing]] checks model responses, whereas this pattern checks inputs. [[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals where rejection or downstream performance differs. [[ml-training-serving-consistency|Training–Serving Consistency]] aligns feature production across environments; a shared schema is one component, alongside matching transformations and semantics.

## Sources and further reading

- [Breck and colleagues: Data Validation for Machine Learning](https://proceedings.mlsys.org/paper_files/paper/2019/hash/928f1160e52192e3e0017fb63ab65391-Abstract.html) — production ML validation system and design experience.
- [TFX: SchemaGen](https://www.tensorflow.org/tfx/guide/schemagen) — schema inference, review, and importing the reviewed artifact.
- [TensorFlow Data Validation: getting started](https://www.tensorflow.org/tfx/data_validation/get_started) — schema constraints, environments, and configured distribution comparisons.
- [TFX: ExampleValidator](https://www.tensorflow.org/tfx/guide/exampleval) — documented component inputs, outputs, and anomaly detection capabilities.
- [JSON Schema: object reference](https://json-schema.org/understanding-json-schema/reference/object) — properties, requiredness, and extra-field policies.
