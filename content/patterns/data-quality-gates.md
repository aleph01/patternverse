---
id: data-quality-gates
type: pattern
title: Quality Gates
summary: A check becomes a decision that holds, rejects, or advances a
  candidate, with incomplete evidence handled explicitly.
status: published
aliases: []
tags:
  - data-engineering
  - quality-observability
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

An orders batch contains duplicate keys. The pipeline records a failed uniqueness check, yet the customer-balance job starts against that batch anyway. It produces doubled balances before anyone responds to the alert.

The check worked. The dependency control did not.

**Quality Gates make a data-processing or publication decision depend on explicit quality evidence.** A candidate proceeds only when the required conditions are satisfied; otherwise, it is held, rejected, or routed through a defined exception process.

Their purpose is to prevent known violations—and missing required evidence—from becoming trusted outputs.

## Connect the verdict to the transition

A quality check asks whether a property holds. A gate controls a transition: accepting an input, publishing a dataset, starting dependent processing, or promoting a model.

The mechanism is:

**Identify the candidate and transition → evaluate required checks → record the decision → permit or hold the transition.**

The transition policy must identify which checks are mandatory, which are advisory, what population they cover, and what happens when they cannot finish.

A weighted quality score is usually insufficient for hard requirements. Ninety-nine successful checks must not compensate for one failed settlement balance if that balance is mandatory.

The gate also needs authority over the actual transition. A failed check cannot stop a dependent job that runs through an ungated path. Its required scope might be one accepted settlement group, a version of an upstream dataset, or a trained model awaiting promotion.

![Orders batch B42 fails uniqueness, so dependent balance processing is held. Corrected B43 passes its required checks and may start that processing. Model M9 fails a required segment check and is held from promotion. Each verdict controls a named transition, rather than merely generating an alert.](../assets/data-engineering/quality-gates.svg "Orders B42 fails uniqueness, so dependent balance processing is held. Corrected B43 passes all required checks and may start processing. Model M9 fails a required segment check and is held from promotion. Permission applies only to the named candidate and transition.")

*Evidence belongs to the candidate and rule set; permission applies to the named transition.*

## Example: stop dependent processing

Orders batch B42 contains ten thousand records. Schema checks pass. Aggregate reconciliation matches the expected count and amount. Order-key uniqueness fails.

The agreement does not excuse duplicate keys. Under this dependency policy, the customer-balance job must not start against B42. Repair produces B43, whose required checks must pass before that specific version becomes an eligible input.

Dagster provides one implementation of dependency gating. Asset checks are nonblocking by default. With `blocking=True`, downstream execution waits; a failed check with `ERROR` severity prevents dependent assets from executing. [Dagster asset-check controls](https://dagster.io/docs/api/dagster/asset-checks)

dbt similarly documents that failing upstream tests in `dbt build` can cause downstream resources to be skipped, while warning severity changes that behavior. [dbt build behavior](https://docs.getdbt.com/reference/commands/build)

These controls govern dependent execution. They do not undo data already exposed upstream or establish an atomic release across every model already built. When the transition being controlled is consumer publication, [[data-publication-quality-gates|Publication Quality Gates]] supplies the more specific candidate-validation and release protocol.

## Match evidence to the intended scope

Suppose B42 passes, another process modifies its table, and the downstream job starts under the old result. The evidence no longer describes the input that job will read.

Pin the checked version or use an equivalent control that keeps validation and consumption aligned. Record candidate identity, input boundaries, transformation version, rule version, checked scope, and results. Passing evidence about one partition cannot authorize an unchecked partition.

For an input spanning several tables, readiness may require a manifest identifying the required table versions. Independently passing tables do not necessarily form a coherent input.

Some evidence expires even when the data does not change. A candidate that met a five-minute freshness objective during validation may breach it while waiting for use. Re-evaluate time-sensitive conditions at the decision boundary. Conditional publication switches and concurrent release ordering belong to [[data-publication-quality-gates|Publication Quality Gates]] and [[data-atomic-publication|Atomic Publication]].

## Example: protect a settlement group

A settlement contains one debit and several balancing credits. One credit references an invalid account.

Dropping that credit and publishing the remaining entries would leave an unbalanced result. The gate therefore covers the entire settlement group. It requires valid references, the expected entries, and a balanced amount before acceptance.

The isolation boundary follows the business relationship. It may be a transaction group, file, partition, or complete dataset—not necessarily one row.

Databricks pipeline expectations illustrate different enforcement choices: retain invalid records with metrics, drop invalid rows, or fail an update. Its documentation states that a failing expectation can atomically roll back a table update, but failure scope depends on execution mode; in a triggered pipeline, other parallel flows can continue independently. [Databricks expectation actions](https://docs.databricks.com/aws/en/ldp/expectations)

Consequently, failing one flow does not automatically gate a multi-table settlement release. The publication boundary still needs explicit coordination.

Quarantine can preserve the problematic record and its evidence. It does not make the remaining settlement complete.

## Example: promote a model only with matching validation

A recommendation model finishes training successfully. Its overall evaluation improves, but a required customer segment falls below the agreed threshold.

Training success does not establish release suitability. The model should remain a candidate while its evaluation result determines promotion.

TFX’s Evaluator supports validating a candidate against a baseline model using developer-defined criteria and producing a “blessing” when those criteria are met. [TFX Evaluator](https://www.tensorflow.org/tfx/guide/evaluator)

TFX’s Pusher consumes validation blessings when deciding whether to push a model to its deployment target. Its documented configuration can include both model evaluation and infrastructure validation. [TFX Pusher](https://www.tensorflow.org/tfx/guide/pusher)

This demonstrates the separation between producing evidence and authorizing a transition.

The evidence must correspond to the candidate model, preprocessing, evaluation dataset, and applicable policy. Reusing an earlier model’s passing result would break the gate’s meaning. Mechanical servability and predictive quality also remain distinct requirements.

## Treat incomplete evidence explicitly

A required check can pass, fail, or remain unresolved.

Unresolved states include timeouts, missing reference data, unavailable validators, skipped checks, and insufficient samples. They should not silently become successful results.

Hold the transition when required evidence is unavailable, then retry or escalate according to policy. A broken validator does not prove the candidate is invalid, but it also does not establish that release is permitted.

Coverage belongs in the decision. A null check returning no failures on an empty dataset may be technically correct while the expected delivery is absent. Required segments and partitions must be accounted for.

For streaming systems, define bounded decision units such as microbatches, transactions, or partitions with explicit progress boundaries. An unbounded stream cannot wait for a final whole-stream verdict.

## Separate firm requirements from uncertain expectations

Hard requirements suit deterministic gates: supported schemas, unique identifiers, valid references, required partitions, and business balances.

Historical volume or distribution expectations need more care. A legitimate promotion can change the data sharply. Automatically blocking every anomaly can turn monitoring sensitivity into a delivery outage.

Use advisory outcomes or a defined review process where the evidence is suggestive rather than decisive. Record the policy instead of changing severity during an incident merely to obtain a green result.

Exceptions should be specific: candidate, affected scope, reason, authorizing owner, compensating controls, and expiry. Preserve the failed check as failed. An authorized exception is a separate release decision, not evidence that the violation disappeared.

## Operate the gate as a dependency

Gates add validation time, candidate storage, orchestration complexity, and potential delivery delay. Repeated full scans can dominate the release window; shared computations and appropriately scoped incremental checks can reduce cost.

Measure gate duration, rejection reasons, unresolved evidence, override frequency, and the age of the published version.

Keeping the previous good version available can preserve service, but it cannot guarantee acceptable freshness indefinitely. Expose its source boundary and define what happens when it becomes too old to use.

Recovery should repair the cause, create or identify the corrected candidate, regenerate required evidence, and release safely. Passing a gate establishes only the tested policy; unchecked defects can still escape.

[[data-publication-quality-gates|Publication Quality Gates]] specializes this transition-control pattern for a validated consumer release; [[data-atomic-publication|Atomic Publication]] makes that release visible coherently. [[data-segmented-quality-checks|Segmented Quality Checks]] prevents aggregate passes from hiding local failures. [[data-quarantine-invalid-records|Quarantine Invalid Records]] preserves rejected evidence. [[data-run-ledgers|Run Ledgers]] records which candidate was checked, held, released, or exceptionally approved.
