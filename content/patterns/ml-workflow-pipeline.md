---
id: ml-workflow-pipeline
type: pattern
title: 'Workflow Pipeline'
summary: 'Express an ML workflow as steps with declared inputs, outputs, dependencies, and release conditions so repeated runs can be scheduled, inspected, and recovered.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

Monday's retraining run finishes, but nobody can tell whether it used the latest validated data or a temporary export. On Tuesday, training fails halfway through. An engineer reruns the notebook from an uncertain cell, then publishes a model before its evaluation finishes. Each individual operation is familiar; coordinating their order and outputs is the problem.

Workflow Pipeline turns that coordination into an explicit, repeatable definition. It makes prerequisites visible and gives each execution a record of what ran, what it consumed, and why later steps proceeded or stopped.

## Core idea

Describe the workflow as **steps connected by dependencies**. A step consumes identified inputs and produces outputs, often saved artifacts such as prepared data, model weights, or an evaluation report. A downstream step becomes eligible when its required predecessors have finished successfully and any additional conditions are satisfied.

The pipeline definition describes the work; a **run** is one execution of that definition. An **orchestrator** schedules eligible steps, tracks their states, and applies configured retry and failure policies. These ideas also work in a small local runner; they do not require a distributed platform.

## How it works

Choose boundaries around useful, independently inspectable work: validate inputs, prepare features, train, evaluate, package, and release. Declare contracts and stable artifact references between them. [TFX's pipeline guide](https://www.tensorflow.org/tfx/guide/understanding_tfx_pipelines) describes artifacts passed between components and execution order derived from their dependencies.

Many workflows form a **directed acyclic graph**, or DAG: arrows point from prerequisites to dependent steps, and following arrows never returns to the starting step. Independent branches can run concurrently when resources permit. Repeated retraining can launch new runs without adding a circular dependency inside one run.

Separate execution status from decision evidence. An evaluation can execute correctly and report unacceptable quality. Give release steps an explicit condition based on that report, rather than interpreting every completed task as approval. [Kubeflow Pipelines' control-flow documentation](https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/) shows conditional execution based on upstream outputs.

Record run parameters, input snapshots, code and environment versions, attempts, outputs, and errors. Publish outputs only when they are complete. Design retries to avoid duplicated effects: repeating a release request should not create two distinct deployments. [Airflow's task guidance](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html) recommends repeatable outcomes on reruns and warns against reading changing “latest” inputs.

## Worked examples

### Dependencies determine what can overlap

Consider a fictional delivery-model workflow using immutable snapshot **D1**. All durations below are chosen teaching values in **minutes**, not measured platform performance. Each attempt occupies one execution slot. The run has two identical slots, with no startup delays or resource contention.

Validate takes **2 minutes**. Prepare takes **3**, using validated data and fitting preprocessing on the training partition only. Train then takes **8**. Its model feeds two independent branches: Evaluate takes **4**, while Package takes **2** to assemble weights, fitted preprocessing, and runtime references. Release takes **1**, but requires the package and a passing evaluation of that same candidate. Packaging alone grants no approval.

Starting at minute zero, Validate finishes at **2**, Prepare at **2 + 3 = 5**, and Train at **5 + 8 = 13**. Evaluate and Package can now overlap. They finish at **17** and **15**, respectively. Release waits for both, starting at **max(17, 15) = 17** and finishing at **18**.

The total executed work is **2 + 3 + 8 + 4 + 2 + 1 = 20 task-minutes**: twenty minutes summed across occupied slots. Elapsed time is eighteen minutes because two task-minutes overlap. With one slot, these same steps take twenty elapsed minutes. More slots do not accelerate this example beyond eighteen: Evaluate remains the slower branch after training.

![Six workflow steps connect validation, preparation and training to parallel evaluation and packaging branches, which must both complete before release. Start and finish times show release at minute eighteen.](../assets/machine-learning/workflow-pipeline.svg 'Trace the prerequisite arrows into Release. Package finishes at minute 15, but evaluation finishes at 17, so release must wait. The two branches overlap only when execution slots are available; a finished package is not permission to release.')

The explorer schedules the graph and computes every attempt's start and finish. Change slot availability, training failures, or the evaluation decision. It simulates orchestration rules, not training, measured speedups, or a real deployment.

```patternverse-widget
{
  "src": "ml-workflow-pipeline.html",
  "title": "Workflow dependencies, retries and release gates explorer",
  "height": 1200,
  "fallback": "With two execution slots and no failures, Validate 0–2, Prepare 2–5 and Train 5–13 precede Evaluate 13–17 and Package 13–15. Release runs 17–18 only if evaluation passes. Total work is 20 task-minutes."
}
```

### A failed attempt differs from a rejected model

Suppose training fails after consuming its full eight minutes, then succeeds on one immediate retry. The attempts occupy **5–13** and **13–21**. Earlier completed steps are retained within this run. Evaluation now finishes at **25**, packaging at **23**, and release at **26**. Work increases to **28 task-minutes**. This is selective task recovery, not restarting the entire workflow.

If both allowed training attempts fail, the run stops at **21 minutes**. Evaluation, packaging, and release are blocked because no completed model artifact exists. The explorer never treats partial training output as usable.

Now let training succeed first time, but evaluation reject the candidate. Evaluation completes at **17**, while its report denies release. Packaging has already finished, but Release never runs. Retrying the evaluation merely to obtain approval would change the decision procedure; it is different from retrying a crashed evaluator.

### Yesterday's cached result needs yesterday's inputs

A separate fictional daily run uses snapshot **D2**, after an upstream correction changes delivery distances. A preparation step that silently reads `deliveries/latest` still appears to receive yesterday's unchanged path. Reusing its previous output can therefore train today's model on yesterday's prepared data.

Make the snapshot identity an explicit input and track changes in code, parameters, and environment when deciding whether reuse is justified. [Kubeflow's caching guide](https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/caching/) documents reusing component outputs for matching inputs and parameters when outputs remain available. A cache cannot detect an undeclared change merely because it affects the real computation. This documented mechanism is separate from the explorer, which does not simulate caching.

## Assumptions for correctness

The graph must represent the actual dependencies, including shared state outside declared inputs. Artifacts must remain accessible, compatible, and associated with the intended run. Two steps are independent only if their data access and effects permit concurrency. Packaging here preserves the evaluated behavior; a conversion that changes predictions needs evaluation of the converted artifact.

Retrying must be safe for the operation involved. Use idempotency keys or transactional publication where appropriate: idempotency means repeated requests have the same intended effect as one request. Specify evaluation criteria before using their results for release. A valid task graph does not establish a valid statistical evaluation.

## When to use it

Use a workflow pipeline for recurring training, batch prediction, evaluation, or data preparation when handoffs, partial failures, expensive recomputation, or release conditions are becoming difficult to manage. It is especially useful when several people or compute environments contribute artifacts.

For a short, disposable experiment, a clear script may suffice. Introduce orchestration when explicit state and recovery earn their maintenance cost.

## Tradeoffs and operating costs

Step boundaries require interfaces, storage, permissions, logs, scheduling infrastructure, and ownership. Excessively small tasks spend time transferring data and starting runtimes. Very large tasks are harder to inspect and repeat selectively.

Parallel branches consume additional simultaneous capacity. Caching and retained artifacts save work only with sound identities and retention policies. Retry limits, timeouts, delays between attempts, and alerts need deliberate configuration; unlimited retries can repeat costly failures or side effects.

## Common mistakes and limitations

A list of commands is insufficient if dependencies and failure behavior remain implicit. Reading mutable paths, publishing incomplete outputs, or ignoring failed gates can make a visually orderly pipeline unreliable. Cleanup and notification steps may need different failure rules from model-producing steps.

Automation also repeats methodological mistakes. Fitting preprocessing on held-out data or selecting models through repeated test-set checks remains problematic inside a correctly scheduled workflow. Runtime and queueing assumptions determine whether estimated completion times resemble reality. This pattern organizes execution; it does not guarantee prediction quality, exactly-once external effects, or reproducible retraining.

## Related patterns

[[ml-batch-serving|Batch Serving]] applies workflow coordination to prepared predictions, with separate completeness checks and consumer lookups. [[ml-checkpoints|Checkpoints]] can resume work inside a failed training step; workflow retries still need explicit task and artifact contracts. [[ml-model-versioning|Model Versioning]] identifies artifacts and complete releases; Workflow Pipeline coordinates the steps that produce and assess them. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] preserves feature semantics across those steps and serving. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] establishes statistical information boundaries. [[ml-continuous-model-evaluation|Continuous Model Evaluation]] repeatedly checks deployed predictions; a pipeline can schedule that process without deciding whether its evidence justifies retraining.

## Sources and further reading

- [TensorFlow: understanding TFX pipelines](https://www.tensorflow.org/tfx/guide/understanding_tfx_pipelines) — artifacts, dependencies, orchestration, and individual runs.
- [Kubeflow Pipelines: control flow](https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/) — conditional execution and parallel branches.
- [Apache Airflow: best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html) — repeatable tasks, complete outputs, and stable input partitions.
- [Kubeflow Pipelines: caching](https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/caching/) — reuse of available component outputs and caching controls.
