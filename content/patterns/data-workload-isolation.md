---
id: data-workload-isolation
type: pattern
title: Bulkhead
summary: Partition constrained capacity into separately enforced compartments so overload in one workload or dependency cannot consume every compartment's allowance.
status: published
aliases:
  - Bulkheads
  - Workload Isolation
tags:
  - data-engineering
  - execution-recovery
  - software-engineering
  - reliability
verses:
  - software-engineering
  - data-engineering
attribution: Bulkheads is catalogued in Michael Nygard’s Release It!; official Microsoft, AWS and Resilience4j guidance establishes resource partitioning and concurrency isolation. Revised Patternverse article retaining its canonical ID and workload-isolation context. Original code and native illustrations.
---

## Purpose and problem

A team starts a six-month backfill at nine in the morning. Every task is valid, but by ten live ingestion is falling behind and dashboards are timing out. Backfill work occupies the same workers and connections that urgent work needs.

One large shared pool uses spare capacity efficiently until a slow dependency or long-running workload holds most of it. Giving live jobs higher priority helps only before dispatch: it cannot reclaim a worker already running a non-preemptible backfill. The system needs an enforceable limit on how much interference one class can cause.

## Core idea

**Partition the scarce resource, then enforce admission separately for each compartment.** A busy compartment reaches its own limit while another retains an allowance. The ship's bulkhead metaphor describes containment; Michael Nygard catalogs Bulkheads as a stability pattern.

Workload isolation applies bulkheads to classes such as live processing and repairs. Dependency isolation applies the same mechanism to independent downstream paths. Neither name promises complete tenant, process, or data isolation.

![A fixed allocation divides twenty worker permits into twelve for live processing, four for backfills, and four for exploration. Backfills at their four-permit limit cannot take the live allowance. Each class has its own admission boundary; all still depend on shared systems that need separate limits.](../assets/data-engineering/workload-isolation.svg "Separate enforced allowances contain interference in the named resource. The 12/4/4 allocation is illustrative. Worker permits are not automatically reserved CPU, memory, or database connections.")

## How it works

### Protect the resource that actually runs out

Name the resource and its scope: concurrent calls, threads, connections, memory, query capacity, or another bottleneck. Two queues feeding unrestricted shared workers do not reserve execution capacity. Separate workers can still compete for one database pool or storage system.

Resilience4j distinguishes semaphore bulkheads, which limit admission on caller threads, from dedicated thread-pool bulkheads with bounded queues. A permit cap does not create threads or reserve CPU. Provision execution capacity separately when that is the guarantee required.

Route every relevant path through the boundary, including retries, manual jobs, and scheduled runs. Keep the limiter instance alive across calls. Trusted workload classification matters: letting a backfill label itself as live work defeats the allocation. Ten processes with a limit of four each can admit forty operations; a process-local limit is not a fleet-wide quota.

### Define saturation and lifetime

Choose whether excess work is rejected, deferred durably, or placed in a bounded queue. Unlimited waiting moves exhaustion into pending requests, memory, or latency. New work and retries must share the intended controls.

Hold an allowance for the entire protected activity, including its cleanup. Releasing it when a caller stops waiting while local work continues understates occupancy. Nested resource acquisition can also create deadlocks or multiply downstream demand: four admitted tasks opening ten connections each can still use forty connections.

## Worked example

### A semaphore boundary with no waiting queue

The Python 3.11+ example gives live and backfill actions separate one-call allowances. It uses real thread-safe semaphores and event-controlled overlap, with no network service. Save `bulkhead.py` and `demo.py` together; run `python3 demo.py`.

Capacity is a positive integer count of simultaneous synchronous action invocations; Boolean values are rejected. Excess calls fail immediately without invoking their action. Actions run on their caller's thread and own their resources before returning or raising. Do not pass an async function or return unfinished work: its lifetime would outlast the permit.

```python
from threading import BoundedSemaphore


class BulkheadFull(Exception):
    pass


class Bulkhead:
    def __init__(self, capacity):
        if type(capacity) is not int or capacity < 1:
            raise ValueError("Capacity must be a positive integer")
        self._permits = BoundedSemaphore(capacity)

    def call(self, action):
        if not self._permits.acquire(blocking=False):
            raise BulkheadFull("Compartment is full")
        try:
            return action()
        finally:
            self._permits.release()
```

```python
from threading import Event, Thread
from bulkhead import Bulkhead, BulkheadFull

live, backfill = Bulkhead(1), Bulkhead(1)
entered, release = Event(), Event()
results = []


def slow_backfill():
    entered.set()
    release.wait()
    return "finished"


worker = Thread(
    target=lambda: results.append(backfill.call(slow_backfill))
)
worker.start()
try:
    if not entered.wait(2):
        raise RuntimeError("Worker did not start")
    try:
        backfill.call(lambda: "must not run")
    except BulkheadFull:
        print("backfill: rejected")
    print("live:", live.call(lambda: "served"))
finally:
    release.set()
    worker.join()
print("backfill:", results[0])
print("next backfill:", backfill.call(lambda: "served"))
```

The four lines are `backfill: rejected`, `live: served`, `backfill: finished`, and `next backfill: served`. The event proves that backfill holds its permit before the second attempt. The live action has both an available permit and a caller thread; the semaphore did not reserve that thread. Once the owned worker finishes and is joined, backfill can enter again.

The two-second wait is a demonstration watchdog, not an action timeout. The `finally` releases the permit before a result or exception reaches its caller. It does not undo changes, stop remote execution, or make the action's shared data thread-safe. A callback that never finishes retains its permit.

![A backfill action acquires its one permit and waits on an event. A second backfill call is rejected without invocation, while a live call uses its independent permit. After the event is released, the first backfill finishes, returns its permit, and permits another backfill call.](../assets/software-engineering/bulkhead-admission.svg "The permit follows the synchronous action's lifetime. Saturation changes admission in that compartment; it does not consume the other compartment's allowance or terminate the action already running.")

### Separating live work from repair compute

A larger scheduler might allocate twenty worker permits as twelve live, four backfill, and four exploration. Apache Airflow pools bound task admission, including weighted slot use. Those scheduling units do not themselves reserve CPU or memory; dedicated workers supply a separate execution boundary.

Snowflake's independent virtual warehouses illustrate compute separation over shared persistent data. Reporting can keep its compute while transformations slow, yet still serve stale results. BigQuery reservations illustrate a different distinction: a production workload relying on borrowed idle slots may lose that extra capacity when neighbors become busy. Its documentation recommends self-reliant capacity for time-bound production work.

## When to use it

Use Bulkhead when workloads or dependencies have different deadlines, costs, or failure behavior, and interference threatens another service objective. Test the protected class while its neighbors are saturated, not only when the system is quiet.

One adequately bounded shared pool is simpler when the work has similar behavior and no class needs independent protection. Start with the smallest resource boundary that contains the expected failure. Stronger process or deployment separation is justified when shared failures remain unacceptable.

## Tradeoffs and common mistakes

Fixed partitions can strand idle capacity while another class rejects work. Borrowing improves utilization only with a credible reclamation policy; a non-preemptible task may not return borrowed capacity promptly. More compartments also add sizing, routing, monitoring, and operating costs. Recovery work needs a service objective so it is not starved indefinitely.

A concurrency cap is not a request-rate limit or a byte limit. This example has no internal queue, fairness guarantee, dedicated execution pool, deadline, or fleet coordination. Cell-based deployment architectures can provide broader boundaries; this semaphore does not create a cell or a security sandbox.

Separate compute also does not prevent conflicting writes, establish fresh data, or restrict permissions. Monitor rejection, queue age, occupancy, duration, and business deadlines per class. A healthy system-wide average can conceal one compartment failing continuously.

## Related patterns

[[data-circuit-breakers|Circuit Breaker]] admits work according to observed dependency health. Bulkhead limits exposure even before failures have accumulated.

[[timeout|Timeout]] bounds waiting; a timeout does not automatically end the work that holds a bulkhead permit.

[[resource-pool|Resource Pool]] owns reusable instances. Bulkhead partitions demand for scarce capacity, which may include separate pools.

[[data-backpressure|Backpressure]] reduces or defers incoming work as capacity fills. Bulkhead supplies the compartments within which those decisions apply.

## Sources

- [Michael Nygard: Release It! Second Edition](https://pragprog.com/titles/mnee2/release-it-second-edition/) — publisher catalog includes Bulkheads among stability patterns.
- [Microsoft: Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) — resource partitioning, containment, and efficiency tradeoffs.
- [AWS: Using dependency isolation to contain concurrency overload](https://builder.aws.com/content/3EuxuD6bWtQ6gEp9FaKQfd3Z2AM/using-dependency-isolation-to-contain-concurrency-overload) — latency-driven concurrency, separate allowances, and hard versus soft allocation.
- [Resilience4j: Bulkhead](https://resilience4j.readme.io/docs/bulkhead) — semaphore and bounded thread-pool implementations.
- [Python: threading](https://docs.python.org/3.11/library/threading.html#semaphore-objects) — bounded semaphores, nonblocking acquisition, events, and thread joining.
- [Apache Airflow: Pools](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/pools.html) — task-slot admission and weighted usage.
- [Snowflake: Architecture](https://docs.snowflake.com/en/user-guide/intro-key-concepts) — independent warehouse compute and shared persistent storage.
- [BigQuery: Reservations](https://docs.cloud.google.com/bigquery/docs/reservations-workload-management) — assigned capacity, idle sharing, and production sizing.

The scenarios, 12/4/4 allocation, code, event sequence, and native diagrams are original teaching material.
