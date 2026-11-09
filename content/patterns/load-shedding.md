---
id: load-shedding
type: pattern
title: Load Shedding
summary: Refuse selected work before expensive processing when an admission policy says available capacity cannot safely accommodate it.
status: published
aliases: []
tags:
  - software-engineering
  - reliability
  - overload
  - admission-control
verses:
  - software-engineering
attribution: Established overload-handling pattern documented by AWS Builders’ Library, Google SRE and Envoy. Original Patternverse weighted-admission example and native illustrations; HTTP semantics attributed to IETF standards.
---

## Purpose and problem

A ticket service receives a sudden rush. It accepts every request, opens database connections, and lets searches wait behind other searches. Customers time out and retry. Soon the service spends so much time holding unfinished requests that even small lookups fail.

Scaling may help later, but it cannot restore capacity immediately. The service needs to preserve useful completions now. That requires deciding which work will not enter the expensive path, rather than promising to do everything and finishing almost nothing on time.

## Core idea

**Reject or drop selected work at an explicit admission boundary so the remaining work can make progress.** AWS calls this Load Shedding. Admission control is the mechanism that can implement the decision; overload protection is the broader goal.

Load balancing distributes traffic across available targets. Shedding deliberately refuses some offered work. Serving a cheaper, degraded response is another overload response: it changes what is computed instead of necessarily refusing the request.

![A request reaches a cheap admission decision before expensive work. If its trusted work cost fits the remaining budget, that cost is claimed and the operation runs. If it does not fit, the service returns an explicit overload result without invoking the operation or adding it to an internal waiting queue. Claimed budget returns after local completion and cleanup.](../assets/software-engineering/load-shedding-admission.svg "Refusal happens before the protected operation. Admission bookkeeping still costs resources, and this boundary cannot recover costs already incurred upstream. A shed request is not silently accepted for later processing.")

## How it works

### Put the decision before the cost

Place the gate before expensive queries, allocations, or downstream fan-out. Parsing, authentication, classification, and generating a refusal still consume resources. At extreme volumes, an earlier network or proxy layer may need to protect the application gate itself.

Choose a signal and policy: outstanding work, queue age, memory pressure, or another measured constraint. Envoy's overload manager, for example, monitors resource pressure and applies configured actions. Its protection of the proxy is distinct from circuit breaking aimed at upstream services.

A request count is a poor budget when costs vary widely. Google SRE describes resource utilization and request criticality as useful inputs. Assign costs and importance through trusted server policy; allowing clients to declare themselves cheap or critical defeats the protection.

### Make refusal and recovery explicit

For HTTP, `503 Service Unavailable` describes temporary inability to handle a request, including overload; `Retry-After` can suggest a delay. `429 Too Many Requests` describes a client sending too many requests in a period. Choose according to the contract, not merely because both can occur under heavy traffic.

Neither response guarantees that retrying is safe or that capacity will exist after the delay. Clients need bounded retry budgets, backoff, jitter, and duplicate-safe operations where applicable. A refusal before this handler executes does not prove that a previous attempt had no effect.

Measure rejected work as well as accepted work. A successful response to a small fraction of callers is not full service availability, even when the accepted requests are fast.

## Worked example

### A weighted budget before a synchronous operation

The ticket service assigns a heavy search two policy units and a light lookup one. A process-local gate has three units available. While a heavy search holds two, another heavy search cannot fit; a light lookup can still use the remaining unit. This is a fit decision, not a priority or reserved-capacity guarantee.

Save `shedding.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Capacity and costs are positive integer policy units, not milliseconds, bytes, CPU reservations, or requests per second. A cost above total capacity is invalid policy input, distinct from temporary occupancy.

```python
from threading import Lock


class Overloaded(Exception):
    pass


class LoadShedder:
    def __init__(self, capacity):
        if type(capacity) is not int or capacity < 1:
            raise ValueError("Capacity must be a positive integer")
        self._capacity, self._used = capacity, 0
        self._lock = Lock()

    def call(self, cost, operation):
        if type(cost) is not int or not 1 <= cost <= self._capacity:
            raise ValueError("Cost must be within 1..capacity")
        with self._lock:
            if self._used + cost > self._capacity:
                raise Overloaded("No work budget available")
            self._used += cost
        try:
            return operation()
        finally:
            with self._lock:
                self._used -= cost
```

```python
from threading import Event, Thread
from shedding import LoadShedder, Overloaded

shedder = LoadShedder(3)
entered, release = Event(), Event()
results = []


def held_search():
    entered.set()
    release.wait()
    return "finished"


worker = Thread(
    target=lambda: results.append(shedder.call(2, held_search))
)
worker.start()
try:
    if not entered.wait(2):
        raise RuntimeError("Worker did not start")
    try:
        shedder.call(2, lambda: "must not run")
    except Overloaded:
        print("heavy: rejected")
    print("light:", shedder.call(1, lambda: "served"))
finally:
    release.set()
    worker.join()
print("held:", results[0])
print("heavy later:", shedder.call(2, lambda: "served"))
```

Output is `heavy: rejected`, `light: served`, `held: finished`, and `heavy later: served`. The event proves that two units are occupied before the competing call. Refusal does not invoke its callback or add waiting work. Local completion returns the held units, permitting later admission.

![With capacity three, a running heavy search occupies two units. A second two-unit search would require four and is refused without invocation. A one-unit lookup fits exactly alongside the running search. After local work finishes and releases its units, a later heavy search can run. Policy units do not reserve execution threads or predict actual resource consumption.](../assets/software-engineering/load-shedding-budget.svg "Two occupied units plus a two-unit request exceed three; two plus one fit. Equality is admitted. The light call has an already available caller thread. The code enforces the declared weighted budget, not a rate, CPU allocation, fairness policy, or fleet-wide limit.")

The lock protects accounting only; callbacks run on their caller threads outside it. Operations must finish their protected work and resource cleanup before returning or raising. An async function or detached task would outlive the accounting scope. The `finally` releases units on callback errors, but does not undo effects or terminate remote work. A caller that stops waiting has not necessarily ended the operation.

The two-second wait is a demo watchdog. The gate creates no execution pool, internal queue, deadline, cancellation mechanism, or HTTP response. Retain one gate across relevant paths, including retries. Separate processes have separate budgets, and inaccurate cost estimates can still overload the real resource.

## When to use it

Use Load Shedding when excess work would otherwise destroy useful completions, especially while capacity changes lag demand. Prefer explicit refusal to silently accepting work that cannot meet its contract. A predictable low-volume service may need only existing bounded server settings.

A second context is optional recommendations on a checkout page. Policy can shed recommendations before checkout operations, but criticality must be assigned deliberately and tested for starvation. The example's weighted fit rule supplies no such classification.

## Tradeoffs and common mistakes

AWS emphasizes useful completions within client deadlines, often called goodput. Load-test beyond normal capacity and measure client-observed outcomes, latency, rejection cost, and downstream saturation. A healthy accepted-only latency chart can hide severe loss of service. Shedding itself can eventually become the bottleneck.

Fixed budgets require calibration as request mix and dependency latency change. Adaptive thresholds need protection against delayed signals and oscillation. Blindly retrying every refusal can recreate overload upstream; dropping already acknowledged durable work violates a different contract.

Shedding may reduce user experience, disadvantage expensive requests, or starve lower-priority work. Define fairness, audit policy decisions, and keep refusal paths cheap. It is not a substitute for sustainable capacity planning, authentication, or abuse controls.

## Related patterns

[[data-backpressure|Backpressure]] asks cooperative senders to slow or wait. Load Shedding refuses work when waiting is unsuitable or capacity must be protected immediately.

[[data-workload-isolation|Bulkhead]] partitions capacity among workloads or dependencies. Shedding can define the refusal policy at a compartment's boundary.

[[queue-based-load-leveling|Queue-Based Load Leveling]] stores temporary excess demand and controls its drain. Shedding declines admission instead of promising eventual processing.

[[data-exponential-backoff-with-jitter|Exponential Backoff with Jitter]] spaces eligible repeat attempts. It must complement refusal rather than multiply demand indefinitely.

## Sources

- [AWS: Using load shedding to avoid overload](https://builder.aws.com/content/3Eun1EEyX6p2e3VYNyRLSJzLuMV/using-load-shedding-to-avoid-overload) — early refusal, goodput, rejection overhead, and overload testing.
- [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/) — variable request cost, resource signals, criticality, and client throttling.
- [Envoy: Overload manager](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/overload_manager) — resource monitors, configured actions, and distinction from upstream circuit breaking.
- [IETF: RFC 9110, 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.4) — temporary overload and `Retry-After` semantics.
- [IETF: RFC 6585, 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) — request-rate refusal and optional retry guidance.
- [Python: threading](https://docs.python.org/3.11/library/threading.html) — lock-protected accounting, event signaling, and owned thread joining.

The ticket scenario, three-unit policy, callback contract, Python experiment, and native diagrams are original teaching material.
