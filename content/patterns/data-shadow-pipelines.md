---
id: data-shadow-pipelines
type: pattern
title: Shadow Pipelines
summary: "Run a candidate pipeline beside production on matched inputs, keeping its outputs and side effects isolated while collecting evidence before a possible handover."
status: published
aliases: []
tags:
  - data-engineering
  - contracts-evolution
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A team rewrites its order pipeline to reduce runtime. Unit tests pass, historical fixtures produce the expected results, and a sample dataset looks correct.

Then the first production run encounters split shipments, late refunds, and customers with several active addresses. Totals drift. Nobody knows whether the rewrite introduced defects or exposed problems in the old implementation.

**Shadow Pipelines run a candidate alongside the production pipeline on matching inputs, while keeping the candidate’s outputs separate from consumers.** The existing pipeline remains authoritative. The shadow produces evidence about correctness, performance, and operating behavior before taking over.

## Follow production without controlling its results

The basic arrangement has four parts: an input feed, the existing pipeline, an isolated candidate, and a comparison process.

Both implementations receive the same selected work. Production continues publishing normally. The candidate writes to private tables, topics, files, or another controlled destination. A comparator matches their outputs and records differences.

The comparison can happen asynchronously. A daily warehouse job might compare completed partitions; a streaming system might compare results after both implementations reach an agreed input boundary.

![Source S52 feeds production and candidate pipelines at a matched input boundary. Production publishes a public release; the candidate writes only a private result. The drawing shows isolation, while Parallel-Run Comparison explains how to assess equivalence.](../assets/data-engineering/shadow-pipelines.svg "Production and candidate both use source S52. Only production publishes. The candidate writes privately and compares matched outputs; equal totals do not justify exposing the candidate without deeper checks.")

A documented example comes from Stripe’s subscription-data migration. After synchronizing old and new stores, Stripe used GitHub’s Scientist library to read through both paths and report inconsistent results before switching reads to the new store. This was comparison within a larger migration, rather than an automatic replacement of production. [Stripe: Online migrations at scale](https://stripe.com/blog/online-migrations)

## “The same data” needs a precise boundary

Two pipelines querying the same mutable table five minutes apart may receive different records. Two streaming jobs starting simultaneously may have different histories. Two enrichment steps may resolve the same identifier against different reference-data versions.

A useful shadow comparison therefore records what each result represents:

- The source snapshot, file manifest, or stream positions processed.
- Relevant starting state and reference-data versions.
- Code, configuration, and comparison-rule versions.
- The output population and completion boundary.

If the experiment changes a dependency intentionally, record that difference as part of the experiment.

Current time, random identifiers, processing order, and external lookups can introduce additional variation. Control them where equivalence requires it, or define how their effects will be evaluated.

Scientist’s documentation highlights this problem: its control and candidate execute sequentially, so changing underlying data can create mismatches. It suggests beginning with both paths running the existing implementation to establish background comparison noise. [GitHub Scientist](https://github.com/github/scientist)

## Example: a warehouse rewrite hides a grain change

Suppose an order model produces one row per order. A rewrite accidentally retains one row per shipment:

| Order | Production rows | Shadow rows | Production total | Shadow total |
|---|---:|---:|---:|---:|
| O17 | 1 | 2 | 1,000 | 1,000 |
| O18 | 1 | 1 | 600 | 600 |

A comparison of total value passes. A report counting rows would still change its answer.

For this experiment, both jobs process the same source snapshot and write separate relations. The comparator checks key coverage, uniqueness at the declared grain, relevant values, and selected downstream results. For O17, duplicate order keys reveal the defect.

The comparison must preserve multiplicity. Treating rows as a mathematical set can conceal duplicate records.

Some differences may be intentional. If the rewrite corrects a documented allocation error, exact agreement with production is the wrong target for affected records. Those cases need independently justified expected results, with separate reporting for approved changes and unexplained discrepancies.

Production is a useful baseline. It is not an unquestionable statement of truth.

## Example: replacing a streaming aggregation

A team replaces a streaming job that calculates ten-minute purchase totals. The shadow consumes the same event topic and writes to a private result topic.

With Kafka’s group-based subscription, the shadow needs a separate consumer group. Members of one group divide partitions among themselves; joining the production group would redistribute work rather than give the shadow an independent copy of the stream. [Apache Kafka consumer documentation](https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/consumer/KafkaConsumer.java)

The candidate also needs sufficient history to initialize its state. Starting with empty deduplication state can double-count retried purchases that production already remembers.

Comparison follows the pipeline’s event-time and correction policy. A production total of 100 and a shadow total of 90 may simply mean the shadow has not processed the last event yet. Record progress and compare corresponding result revisions after both reach the agreed boundary. A shadow that never catches up remains an operational failure, even if its completed windows match.

Sampling requires care here. Randomly copying individual events can destroy sessions, joins, and aggregates. Sampling complete keys, with their required history, may preserve the behavior being tested more faithfully.

## Example: evaluating a candidate model

A prediction service can copy selected inference requests to a candidate model while returning only the production model’s response.

Amazon SageMaker AI implements this arrangement with shadow variants. A production variant responds to incoming requests, while a configured percentage is replicated to a shadow variant. Optional data capture records requests and responses for analysis, and monitoring supports comparison of operational metrics. [SageMaker AI shadow tests](https://docs.aws.amazon.com/sagemaker/latest/dg/shadow-tests-create.html)

Suppose production assigns a request a score of 0.18 and the candidate assigns 0.24. That difference is an observation, not automatically a defect. The experiment might examine latency, failures, score distributions, decision-threshold crossings, and performance against labels when they become available.

Shadowing also has a causal limitation: the candidate’s recommendation did not determine what happened. It cannot directly establish how users would respond if that recommendation were served. That requires additional evaluation or a controlled live experiment.

## Isolate effects as well as outputs

Writing candidate results to another table is insufficient if the candidate still sends notifications, updates customer records, advances production checkpoints, or invokes external actions.

Shadow execution needs separate destinations, state, and permissions appropriate to its role. Any action-producing stage needs an explicit shadow behavior, such as recording the proposed action privately.

Resource isolation matters too. A candidate can degrade production by doubling source queries, exhausting connections, or competing for warehouse capacity. Give it quotas, timeouts, bounded queues, and a way to stop it without disrupting production.

A library that returns the control result does not necessarily provide this isolation. Scientist, for example, warns that candidate execution can still cause timeouts. [Scientist error-handling guidance](https://github.com/github/scientist#handling-errors)

## Count the comparisons that never happened

A dashboard reporting “100% agreement” is misleading if it includes only successful pairs.

Suppose 10,000 records were selected for comparison, 9,500 matched, and 500 candidate executions timed out. The report should expose all three quantities. Missing candidate outputs, comparator failures, and excluded cases need visible categories.

Define acceptance criteria before reviewing results. Useful evidence includes coverage across important segments, unexplained differences, lag, error rates, resource consumption, and behavior during peaks or recovery. Numerical tolerances should reflect the domain; a broad percentage tolerance can hide meaningful errors in small values.

Retain enough lineage to reproduce discrepancies. Avoid filling comparison logs with complete sensitive payloads when identifiers, controlled samples, and restricted diagnostic storage will suffice.

## End the experiment deliberately

Shadow pipelines are useful for engine migrations, substantial refactors, new enrichment logic, and changes that fixtures cannot adequately represent.

They add compute, storage, source load, monitoring, and investigation costs. A reduced traffic sample can reveal defects cheaply, but it provides limited evidence about full-load capacity or rare cases. Equivalent results can also conceal a bug shared by both implementations.

Promotion remains a separate release decision. The candidate needs current state, a defined publication boundary, and a recovery plan. After the transition and required observation period, retire the shadow machinery so that a temporary experiment does not become an unowned permanent pipeline.

## Related patterns

[[data-source-to-target-reconciliation|Source-to-Target Reconciliation]] supplies techniques for comparing populations and values. Shadow pipelines apply them to competing implementations.

[[data-deterministic-transformations|Deterministic Transformations]] reduce unexplained variation and make discrepancies reproducible.

[[data-workload-isolation|Workload Isolation]] protects production resources while the candidate processes realistic work.

[[data-atomic-publication|Atomic Publication]] controls the eventual handover so consumers receive a coherent release after the shadow experiment supports promotion.
