---
id: ml-batch-serving
type: pattern
title: 'Batch Serving'
summary: 'Compute predictions for an identified input set ahead of consumption, then publish checked, versioned results for later use with explicit coverage and freshness policies.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

Every morning, a planning dashboard needs demand predictions for thousands of merchants. Predictions need not change with every page view. Calling a model on every visit repeats work and makes the dashboard depend on live inference.

Batch Serving moves that computation ahead of consumption. A job scores an identified set of inputs, saves the predictions, and makes them available to a downstream report, application, or operational process. Consumers receive prepared answers with identified timing and coverage.

## Core idea

Separate **prediction production** from **prediction consumption**. The producer scores a defined input set; the consumer later reads its results, often by an entity key such as merchant ID.

The job may run on a schedule or be triggered when data arrives. “Batch” describes the serving arrangement; it does not require a nightly cadence. Nor is it the same as combining several live requests into a model’s internal inference batch. The defining relationship is that the prepared prediction set exists independently of the later consumer request.

## How it works

Define the population to score, the input cutoff, the prediction target, and when consumers need the results. A cutoff identifies the input snapshot; a target specifies what the answer concerns, such as demand in a particular future window. These timestamps have different meanings.

Pin compatible model and preprocessing versions, then score the snapshot. Preserve the association between each input and its prediction. [SageMaker’s batch-transform guide](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html) documents offline inference without a persistent endpoint and distribution across input files. Its [input/output association guide](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html) shows retaining an ID alongside the prediction while excluding that ID from model features.

Write results to a run-specific location and check them before making them active. Check expected keys, duplicate keys, failed records, schema, finite outputs, and artifact identities. A consumer-facing reference can identify one approved result set. Switching that reference should expose a coherent version under the chosen storage system’s consistency guarantees.

Choose whether publication requires every expected result or permits explicitly represented partial coverage. Retain an older completed set when a replacement is unusable, and decide when that older set becomes too stale. A job’s success status alone does not establish that its answers satisfy the consumer’s contract.

## Worked examples

### A quick lookup can return an older prediction

All records and times here are fictional. Times are **UTC on 12 May 2026**. Both runs predict demand, in **items**, for the same **12:00–18:00** replenishment window. Their input feature is orders received since midnight and known by the respective cutoff. The four merchants have known observation coverage, so C’s zero is an observed count.

For transparent arithmetic, a fixed teaching model **M1** predicts **two items per observed order plus one item**. This rule stands in for an already available model; no training or accuracy experiment is performed.

| Merchant | Orders at 07:00 | Orders at 08:00 | New predicted items |
| :------- | --------------: | --------------: | ------------------: |
| A        |               3 |               4 |                   9 |
| B        |               6 |               7 |                  15 |
| C        |               0 |               0 |                   1 |
| D        |               1 |               2 |                   5 |

Run **R7** used the 07:00 snapshot and published at **07:20**. Run **R8** uses the 08:00 snapshot and takes **20 minutes**, including validation and publication. Its complete result set becomes active at **08:20**, with no additional propagation delay in this example.

At **08:10**, R8 is not ready. A lookup for A therefore reads R7’s prediction: **2 × 3 + 1 = 7 items**. After successful publication, an **08:30** lookup returns R8’s **2 × 4 + 1 = 9 items**.

The new prediction’s **input-cutoff age** is **08:30 − 08:00 = 30 minutes**, although it has been published for only **10 minutes**. A fast lookup does not make its source inputs current. This consumer accepts cutoff ages of **at most 120 minutes**; that policy does not establish predictive quality or the age of every underlying observation.

![Four merchant records are scored from an eight o’clock input snapshot. All four results pass the publication check at eight twenty. An eight thirty lookup for merchant A returns nine items, with an input-cutoff age of thirty minutes.](../assets/machine-learning/batch-serving.svg 'Follow the candidate result set through the publication check into the consumer lookup. The active run supplies the answer; compare its input cutoff with the lookup time to judge age, separately from when publication finished.')

The explorer computes these predictions and simulates the active-set reference. Change lookup time, result completeness, or merchant. It shows which run is visible and applies the stated age policy. Its timing and consistency rules are teaching assumptions.

```patternverse-widget
{
  "src": "ml-batch-serving.html",
  "title": "Batch prediction publication and lookup explorer",
  "height": 1200,
  "fallback": "A complete R8 run scores four merchants from the 08:00 snapshot and publishes at 08:20. At 08:30, A receives 9 predicted items with an input-cutoff age of 30 minutes. If B’s result is missing, the four-of-four publication policy retains R7, and A instead receives 7 items aged 90 minutes. Predictions concern the same 12:00–18:00 window."
}
```

### Incomplete, missing, zero, and stale are different states

Suppose R8 finishes with A, C, and D scored but B’s result absent. Three results out of four give **3 / 4 = 75% coverage**. This application requires **four of four expected keys**, so it does not activate R8. At 08:30, the older R7 remains visible, and A’s prediction of 7 items has cutoff age **90 minutes**. It still meets the 120-minute policy.

The missing result does not become a zero prediction. Neither does a request for newly encountered merchant **E**, absent from both snapshots. That lookup is **missing**. C is present with zero orders and receives the rule’s explicit prediction of **1 item**.

At **10:00**, a complete R8 is exactly **120 minutes** old and accepted. At **10:01**, it is **121 minutes** old and blocked. The explorer returns no usable prediction then, retaining the stored value for inspection. A real application could choose a separately evaluated fallback; it should not silently relabel stale answers as fresh.

### Retries must preserve result identity

A separate fictional export has **1,000 expected records** split into four partitions of **250**. If one partition must be retried, scoring work becomes **1,000 + 250 = 1,250 record evaluations**, assuming each initial partition was fully scored. The final result should contain **1,000 unique keys**, without appending duplicate retry rows.

Use stable run and record identities, fixed input references, and publication that tolerates repeated execution. [Airflow’s task guidance](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html) recommends repeatable reruns, partition-specific inputs, and avoiding incomplete outputs. Those principles apply to a batch prediction workflow without requiring Airflow. This retry example is arithmetic only; the explorer does not execute partition retries.

## Assumptions for correctness

Inputs, transformations, and model artifacts must remain compatible and identifiable. Entity keys must join predictions to the intended consumers, and the target window must still match the decision being made. Define the population and permissible missing coverage.

Consumers must read a coherent published set and enforce the relevant age policy. The example switches readers between complete sets, assuming trustworthy clocks, no propagation delay, and an already completed R7. Real storage and readers need equivalent guarantees or a documented way to handle weaker consistency.

## When to use it

Use batch serving when predictions can be prepared before use: recurring planning, bulk document enrichment, scheduled risk review, or large offline reports. It fits applications whose update deadlines permit processing and publication delays.

[Azure’s batch-endpoint documentation](https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoints-batch?view=azureml-api-2) describes asynchronous jobs reading stored inputs and writing outputs for later use. This documented implementation is not executed here. Prefer request-time or event-driven prediction when essential inputs arrive only with the decision, or a prepared answer becomes obsolete too quickly.

## Tradeoffs and operating costs

Precomputation can share setup work and use parallel resources, but also scores entities whose results may never be read. Storage, data movement, monitoring, retries, and retained result versions add costs. Parallelism does not eliminate skewed partitions or upstream delays.

Choose refresh frequency from decision needs and observed production capacity. Monitor deadline misses, input age, coverage, failed keys, and consumer fallback rates alongside model quality. Results must arrive in time and remain suitable for consumption.

## Common mistakes and limitations

Do not overwrite the active result table record by record while consumers expect one coherent run. Do not assume a row count proves correct coverage: duplicate keys can hide missing entities. Preserve error records and distinguish missing, stale, and legitimate zero-valued inputs or outputs.

Publishing predictions is not retraining the model. Reusing an old model with fresh inputs and reusing old predictions are separate choices. A complete, fresh batch can still contain poor predictions, and downstream actions require their own safeguards against duplicate execution.

## Related patterns

[[ml-workflow-pipeline|Workflow Pipeline]] coordinates scoring dependencies and retries. [[ml-model-versioning|Model Versioning]] identifies the compatible artifacts behind each run. [[ml-feature-store|Feature Store]] prepares reusable input features; batch serving stores final predictions for consumption. [[ml-continuous-model-evaluation|Continuous Model Evaluation]] joins consumed predictions to outcomes so operational success can be checked against predictive quality.

## Sources and further reading

- [Amazon SageMaker AI: Batch transform](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html) — offline inference, partitioning, and result files.
- [Amazon SageMaker AI: Associate prediction results with input records](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html) — retaining identity through scoring.
- [Azure Machine Learning: Batch endpoints](https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoints-batch?view=azureml-api-2) — asynchronous inference over stored data.
- [Apache Airflow: Best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html) — repeatable tasks, fixed partitions, and complete outputs.
