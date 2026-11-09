---
id: ml-feature-store
type: pattern
title: 'Feature Store'
summary: 'Share governed feature definitions and identified values across historical training retrieval and operational lookups, with explicit version, freshness, and missing-value policies.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A demand model and a delivery model both use a merchant's recent order count. Their teams write separate queries. One counts the preceding hour; another counts since the start of the hour. Serving adds a third implementation with a periodically refreshed table. All three columns are integers named `recent_orders`, yet they describe different inputs.

A Feature Store gives teams a shared place to discover feature definitions and retrieve their values through supported paths. It reduces duplicated coordination work while making ownership, meaning, and operating expectations explicit.

## Core idea

Separate **what a feature means** from **how a consumer retrieves it**. Register a definition with its entity key, computation, data sources, types, time semantics, and owner. An entity is the object described by the value: here, a merchant identified by `merchant_id`.

Support the access patterns consumers need. Historical retrieval builds training rows for past decisions. Operational retrieval may serve a prepared, current value quickly by entity key. Sharing a definition does not mean these paths should return identical numbers for different cutoffs, or that every stored value is sufficiently fresh.

## How it works

Start with a reusable feature and its contract. For an order count, specify the window, timezone, duplicate handling, eligible order states, and which timestamp determines inclusion. Record a stable definition version so an existing model can continue requesting the meaning it was evaluated with.

Keep the catalog distinct from the values. [Feast's registry](https://docs.feast.dev/getting-started/components/registry) stores definitions and metadata; its [feature views](https://docs.feast.dev/getting-started/concepts/feature-view) describe logical groups of time-series features, including entity and schema information. These are documented implementation concepts, not requirements to use Feast.

Compute values through batch jobs, streams, or supported request-time transformations. A store need not perform every transformation itself: [Feast's architecture overview](https://docs.feast.dev/getting-started/components/overview) includes upstream SQL or Spark computation. Preserve sufficient history for the intended training and replay questions.

For fast serving, **materialization** publishes prepared values into an online store. Feast's documented [online-store behavior](https://docs.feast.dev/getting-started/components/online-store) retains the latest values per entity rather than their history. The historical path therefore reads retained sources or historical values, not that latest-only copy.

Return or log the definition identity and relevant timestamps alongside values. Check compatibility and freshness before invoking a model, and declare what missing or unusable values cause. These checks require implementation: installing a feature store does not automatically enforce every consumer's contract.

## Worked examples

### One definition, two legitimate answers

All records and computations below are fictional. Merchant A has these order events on **12 May 2026, UTC**. Every order represented by a row occurs at its listed event minute. The source has observed this merchant since 08:00; each row becomes usable one minute after its event.

| Event time | Orders | Usable from |
| :--------- | -----: | :---------- |
| 09:10      |      4 | 09:11       |
| 09:35      |      3 | 09:36       |
| 09:48      |      5 | 09:49       |
| 10:03      |      8 | 10:04       |

Definition **v1** counts available orders in the preceding **60 minutes**. At cutoff t, include events **later than t − 60 minutes and at or before t**, whose usable time is also at or before t. Thus the lower boundary is excluded and the upper boundary included. Availability describes this example's observable input, not eventual corrected truth.

A training row for **09:40** receives **4 + 3 = 7 orders**. The later events were not available then. [Feast's historical-join guide](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) documents per-row event cutoffs and lookback limits. Replaying exactly what was usable additionally requires suitable availability history and retrieval rules; an event timestamp alone cannot establish it.

At **10:05**, suppose the latest online refresh was **10:00**. That snapshot contains **4 + 3 + 5 = 12 orders**. Recomputing from the source at 10:05 gives **4 + 3 + 5 + 8 = 20**. The difference, **8 orders**, comes from work not yet reflected in the online copy, despite using the same definition.

The snapshot's age is **10:05 − 10:00 = 5 minutes**. This consumer accepts ages of at most **10 minutes**, so 12 is usable under its stated policy. Acceptance does not mean equality with a fresh recomputation. Seven, twelve, and twenty refer to different cutoffs; their difference is not a model-error measurement.

![A shared sixty-minute order definition feeds a historical training lookup returning seven orders and an online snapshot returning twelve. A fresh recomputation at the serving time returns twenty, exposing materialization lag.](../assets/machine-learning/feature-store.svg 'Compare the cutoffs before comparing the counts. Historical retrieval gives the training decision its own past inputs; the online copy reflects its last refresh. Shared meaning permits different values, while the bars reveal how far the published copy lags this source recomputation.')

The explorer executes the window aggregation, creates a simulated online snapshot, and applies a consumer guard. Change serving time, refresh schedule, or definition version. Its freshness and compatibility checks are teaching policies, not claims about feature-store defaults or measured serving performance.

```patternverse-widget
{
  "src": "ml-feature-store.html",
  "title": "Shared feature definition and online freshness explorer",
  "height": 1200,
  "fallback": "Definition v1 gives 7 orders for a 09:40 training decision. At serving time 10:05, the 10:00 online snapshot contains 12 orders and is 5 minutes old; a fresh recomputation gives 20. Model M1 accepts v1 snapshots no older than 10 minutes."
}
```

### A window change needs a new contract

Definition **v2** counts **30 minutes** instead. At cutoff 10:00 it includes the 09:35 and 09:48 rows, giving **3 + 5 = 8**, rather than v1's 12. At 10:05, its lower boundary is 09:35, so that exact-boundary row is excluded: **5 + 8 = 13**.

Both versions produce integer order counts. Type checking alone cannot detect that v2 changes what the model sees. The explorer's model M1 explicitly expects v1; its guard rejects v2 rather than silently switching meanings. Real systems need an equivalent compatibility arrangement, which may use distinct names, versions, or pinned feature references. A registry entry alone does not enforce it.

### Missing history is different from zero activity

A newly encountered merchant B has no registered observation history. Its result is **missing**, not zero. Merchant C has known observation coverage but no orders in the window; its count is legitimately **0**. The difference requires source coverage information, not merely an empty list of events.

A declared policy might defer B's request or use a separately evaluated fallback. Likewise, pausing A's refresh at **09:45** leaves a snapshot aged **20 minutes** at 10:05. The explorer blocks M1 under its ten-minute policy; it does not replace stale or missing inputs with zero. This application age check is separate from a storage retention setting or historical lookback limit.

## Assumptions for correctness

Entity keys and feature meanings must agree across producers and consumers. Historical records need trustworthy timestamps and enough retained versions for the intended reconstruction. Corrections, late events, and publication delays require explicit treatment.

Batch and streaming computations must implement compatible semantics. Shared metadata does not prove identical handling of boundaries, duplicates, or missingness. Returning several features also does not necessarily provide one atomic snapshot across all their sources; check that requirement separately.

## When to use it

Use a feature store when several models or teams reuse features, historical training joins are recurring work, or low-latency lookups require coordinated publication. It helps when ownership and discoverability are becoming as difficult as computation.

A single batch model with a clear, versioned dataset may need only a well-managed table and shared code. An online store adds little when no consumer needs online retrieval.

## Tradeoffs and operating costs

Operating both historical and online paths adds storage, refresh jobs, permissions, observability, and failure handling. Faster refresh may increase computation and write costs. Shared features also create shared failure dependencies: a broken producer can affect several models.

Monitor publication lag, missing-key rates, lookup failures, definition changes, and downstream quality. Assign owners for incidents and deletion propagation, including derived copies. A central catalog does not replace appropriate data access controls.

## Common mistakes and limitations

Do not train historical decisions from today's latest table, overwrite a definition's meaning beneath an existing model, or confuse fast retrieval with fresh data. A populated cache is not evidence of healthy upstream computation.

Feature storage does not establish predictive usefulness, correct labels, or a valid evaluation split. It cannot automatically reconstruct discarded availability history or guarantee that every serving request used the intended value. Keep serving evidence where operational replay matters.

## Related patterns

[[ml-point-in-time-feature-retrieval|Point-in-Time Feature Retrieval]] defines historical eligibility; a Feature Store can provide that retrieval path. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] aligns computations and fitted state. [[ml-model-versioning|Model Versioning]] binds a model to compatible feature identities. [[ml-workflow-pipeline|Workflow Pipeline]] coordinates computation, publication, and recovery without itself defining feature meaning.

## Sources and further reading

- [Feast: registry](https://docs.feast.dev/getting-started/components/registry) — definition catalog, metadata, and controlled updates.
- [Feast: feature views](https://docs.feast.dev/getting-started/concepts/feature-view) — entities, schemas, and grouped feature sources.
- [Feast: architecture overview](https://docs.feast.dev/getting-started/components/overview) — computation, materialization, training, and serving responsibilities.
- [Feast: online store](https://docs.feast.dev/getting-started/components/online-store) — latest-value storage and publication paths.
- [Feast: point-in-time joins](https://docs.feast.dev/getting-started/concepts/point-in-time-joins) — historical cutoffs and lookback semantics.
