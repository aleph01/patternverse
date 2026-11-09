---
id: software-reliability-failure-handling
type: collection
title: Reliability and Failure Handling
summary: Keep slow or failed operations from spreading damage by making waiting, failure outcomes, and recovery responsibilities explicit.
status: published
verses:
  - software-engineering
items:
  - timeout
  - data-exponential-backoff-with-jitter
  - data-circuit-breakers
  - data-workload-isolation
  - queue-based-load-leveling
  - data-backpressure
  - load-shedding
  - health-endpoint
---

These patterns examine how software responds when useful work is delayed, interrupted, or left with an uncertain outcome.

[[timeout|Timeout]] limits a particular wait with an explicit budget and expiry path, distinguishing a caller’s deadline from cancellation, cleanup, and confirmation of remote effects.

[[data-exponential-backoff-with-jitter|Exponential Backoff with Jitter]] spaces eligible retries using growing randomized delay windows, keeping retry safety, attempt limits, total budgets, and aggregate load control distinct.

[[data-circuit-breakers|Circuit Breaker]] uses dependency outcomes to reject new calls during unhealthy periods and admit limited recovery probes, leaving timeouts, concurrency limits, retained work, and uncertain effects explicit.

[[data-workload-isolation|Bulkhead]] partitions enforced resource allowances across workloads or dependencies, separating admission, execution capacity, action lifetime, and shared downstream limits.

[[queue-based-load-leveling|Queue-Based Load Leveling]] buffers temporary demand peaks and controls aggregate consumption, keeping durable admission, business completion, backlog age, and downstream capacity explicit.

[[data-backpressure|Backpressure]] carries capacity feedback upstream, making admission, unfinished work, source waiting, and readiness distinct from durable completion.

[[load-shedding|Load Shedding]] refuses selected work before expensive processing, keeping trusted admission policy, useful completions, refusal costs, and retry consequences explicit.

[[health-endpoint|Health Endpoint]] exposes declared health evidence for an external observer, separating liveness, readiness, startup, and the policies that act on them.
