---
id: data-engineering-execution-recovery
type: collection
title: Execution & recovery
summary: Data engineering patterns for execution & recovery.
status: published
verses:
  - data-engineering
items:
  - data-atomic-publication
  - data-bounded-retries
  - data-checkpoint-and-resume
  - data-compensating-actions
  - data-data-aware-dependencies
  - data-idempotent-writes
  - data-leases-with-fencing-tokens
  - data-replayable-backfills
  - data-run-ledgers
  - data-separate-backfill-from-live-processing
  - data-transactional-consume-process-publish
  - data-transactional-inbox
---

Explore 12 field-guide articles on execution & recovery. Each article develops a concrete problem, explains the design response, and discusses examples and limits.

[[data-dead-letter-queues|Dead Letter Channel]] covers the failed-message recovery mechanism in Messaging and Integration, including retention, safe handoff, and controlled redrive. Its canonical article remains available to Data Engineering readers.

[[data-exponential-backoff-with-jitter|Exponential Backoff with Jitter]] covers retry spacing, safety, and budgets in Reliability and Failure Handling. Its canonical article remains available to Data Engineering readers.

[[data-circuit-breakers|Circuit Breaker]] covers dependency-health admission and recovery probes in Reliability and Failure Handling. Its canonical article remains available to Data Engineering readers.

[[data-workload-isolation|Bulkhead]] covers workload and dependency capacity compartments in Reliability and Failure Handling, retaining Workload Isolation as its earlier title and its Data Engineering applications.
