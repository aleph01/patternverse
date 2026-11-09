---
id: data-circuit-breakers
type: pattern
title: Circuit Breaker
summary: Temporarily reject new calls to an unhealthy dependency, then admit limited recovery probes before allowing normal traffic again.
status: published
aliases:
  - Circuit Breakers
tags:
  - data-engineering
  - execution-recovery
  - software-engineering
  - reliability
verses:
  - software-engineering
  - data-engineering
attribution: Circuit Breaker was popularized by Michael Nygard in Release It!; Martin Fowler and official Microsoft, Resilience4j and Polly documentation support the mechanism. Revised Patternverse article preserving its canonical ID and warehouse context. Original code and native illustrations.
---

## Purpose and problem

A warehouse takes fifteen seconds to reject writes. Ingestion workers keep sending batches, waiting, timing out, and retrying. Their connection pools fill, queues grow, and unrelated pipelines cannot obtain workers. The dependency has failed, but repeatedly committing resources to unlikely calls spreads the incident.

The caller needs to reduce that exposure while retaining a way to discover recovery. Permanently disabling the integration prevents useful work after repair; immediately reopening it can unleash the entire backlog against a barely functioning service.

## Core idea

**Use recent dependency outcomes to govern admission of new calls.** Closed allows calls and records relevant outcomes. Open rejects new calls through that breaker without invoking the dependency. Half-open permits limited trials whose results decide whether normal traffic should resume.

The electrical metaphor reverses a common intuition: a closed circuit conducts; an open circuit interrupts. Michael Nygard popularized the pattern in *Release It!*; Martin Fowler describes its protection against cascading remote-call failures. The cooldown establishes permission to test, not evidence of health.

![Closed admits calls and observes classified outcomes. A threshold opens the breaker and rejects new calls. After a cooldown, a subsequent call may enter half-open as a limited probe. A successful qualifying probe closes the breaker; a failed probe reopens it and restarts the cooldown.](../assets/data-engineering/circuit-breakers.svg "Admission changes with state. The general pattern allows different sampling and probe policies; the worked model uses two counted failures and one recovery probe. Open-state rejection is not buffering or cancellation of earlier calls.")

## How it works

### Scope and classify observations

Retain the breaker across calls. A fresh instance per request cannot accumulate useful history. Group calls by a relevant failure boundary: supplier A's outage should not block independent suppliers B and C. A host-based grouping can help, but independently failing tenants or shards may require another scope.

Count failures that indicate dependency health. A malformed product ID is usually a request problem, not a reason to stop every lookup. Define treatment of timeouts, slow successes, ignored exceptions, and local rejection separately. A probe should exercise the protected operation: a lightweight status endpoint may succeed while writes remain broken.

A production policy might observe the last 100 calls, require 20 samples, and open at a failure rate of at least 50%. Twelve failures in twenty calls reach 60%. Resilience4j documents these configurable windows, minimum samples, slow-call rules, and probe allowances; these numbers are teaching choices.

### Keep ownership separate from admission

Opening does not cancel already admitted calls, repair the service, store rejected batches, or roll back uncertain writes. The ingestion owner must retain a batch durably before acknowledging its input. A locally rejected batch never reached the warehouse through that call; an earlier timed-out write may already have committed.

Concurrent implementations must serialize admission and state updates, limit simultaneous probes, and define how late completions affect recovery. That does not mean holding a lock around remote execution. Closed-state traffic can still exhaust concurrency before enough failures complete. One probe per process also means 500 probes across 500 processes, not one fleet-wide trial.

## Worked example

### A deterministic warehouse writer

This Python 3.11+ **single-caller simulation** exposes admission and recovery without network access or real-time sleeping. Save `breaker.py` and `demo.py` together; run `python3 demo.py`. One retained breaker protects one dependency. Its supplied clock is nondecreasing virtual milliseconds. Actions are synchronous, zero-argument callables that own cleanup before returning or raising.

Two counted `DependencyFailure` outcomes since the last successful call open it. The cooldown is 100 ms from failure completion. At or after that boundary, the next call becomes one probe. Other errors leave the closed-state counter unchanged; an inconclusive probe reopens without counting a dependency failure. These policies differ from a rate-window implementation.

```python
class DependencyFailure(Exception):
    pass


class CircuitOpen(Exception):
    pass


class Breaker:
    def __init__(self, clock):
        self.clock = clock
        self.state = "closed"
        self.failures = 0
        self.retry_at = 0

    def _open(self):
        self.state = "open"
        self.retry_at = self.clock.now_ms + 100

    def call(self, action):
        if self.state == "half-open":
            raise CircuitOpen("Probe already active")
        if self.state == "open":
            if self.clock.now_ms < self.retry_at:
                raise CircuitOpen("Cooldown not complete")
            self.state = "half-open"
        probe = self.state == "half-open"
        try:
            value = action()
        except DependencyFailure:
            self.failures += 1
            if probe or self.failures >= 2:
                self._open()
            raise
        except BaseException:
            if probe:
                self._open()
            raise
        else:
            self.state = "closed"
            self.failures = 0
            return value
```

```python
from breaker import Breaker, CircuitOpen, DependencyFailure


class Clock:
    now_ms = 0


clock = Clock()
breaker = Breaker(clock)
calls = 0


def write():
    global calls
    calls += 1
    if calls < 4:
        raise DependencyFailure("warehouse unavailable")
    return "written"


def show():
    try:
        print(breaker.call(write), breaker.state)
    except (DependencyFailure, CircuitOpen) as error:
        print(type(error).__name__, breaker.state)


show()
show()
show()
clock.now_ms = 100
show()
clock.now_ms = 199
show()
clock.now_ms = 200
show()
print("dependency calls:", calls)
```

The seven lines are `DependencyFailure closed`, `DependencyFailure open`, `CircuitOpen open`, `DependencyFailure open`, `CircuitOpen open`, `written closed`, and `dependency calls: 4`. Two local rejections never invoke `write`. The failed probe at 100 ms restarts the cooldown; 199 ms remains too early, while equality at 200 ms admits the successful probe.

Advancing time alone performs no background transition. The next call checks the boundary. A successful probe resets history; ordinary business errors and cancellation propagate rather than becoming successful values. The model requires one active caller and no recursive closed-state calls. Its half-open guard illustrates probe admission, but does not make it thread-safe. It supplies neither per-call timeouts nor durable batch storage.

![Six sequential calls use one retained breaker. Two failures at time zero open it; a third call at zero is rejected locally. A probe fails at 100 milliseconds and reopens until 200. A call at 199 is rejected; a successful probe at 200 closes the breaker. Only four calls reach the simulated dependency.](../assets/software-engineering/circuit-breaker-trace.svg "Local rejection never invokes the protected action. A failed probe restarts the cooldown from its completion; the next probe is admitted at the exact boundary. Times and outcomes belong to the sequential teaching model.")

### An honest fallback has its own contract

An enrichment feed may label a cached catalog value as version V17 while the last remote version was V18. That can preserve a dashboard, but may be wrong for event-time accounting. An empty description or zero price disguised as success hides the outage. Fallback selection and provenance belong to the application, with their own resource limits.

## When to use it

Use it when sustained dependency failures or slowness can consume caller resources and a period of local rejection is preferable to repeated exposure. Prefer a maintained implementation whose scope, classifiers, probe behavior, and state ownership are understood.

One attempt with a suitable timeout and existing platform isolation may suffice for a simpler boundary. If most failures are invalid records, fix classification or quarantine those records. A breaker cannot supply missing capacity or determine whether rejected business work may be discarded.

## Tradeoffs and common mistakes

Thresholds trade sensitivity against false trips. Low traffic can delay a minimum sample; brief cooldowns cause repeated probing; long cooldowns delay recovery. Probe success demonstrates limited functionality, not capacity to drain a backlog immediately. Resume at a controlled rate.

Observe state transitions, local rejections, dependency latency, probes, backlog age, and fallback use together. A falling error count may simply mean that calls are blocked. Tight retries of local rejection waste resources; bypassing the execution API based on an open-state check can also prevent lazy recovery transitions. Polly documents that specific mistake.

This model is process-local and sequential. It does not synchronize threads, share fleet state, cancel in-flight work, detect slow calls, or enforce deadlines. Even a production breaker needs concurrency and timeout controls, plus a policy for uncertain effects and pending work.

## Related patterns

[[timeout|Timeout]] bounds an admitted wait; Circuit Breaker decides whether a later call should be admitted at all.

[[data-exponential-backoff-with-jitter|Exponential Backoff with Jitter]] spaces retry attempts. Local breaker rejection should not trigger a tight retry loop.

[[data-backpressure|Backpressure]] regulates incoming work and backlog growth while downstream processing is constrained.

[[data-idempotent-writes|Idempotent Writes]] protects uncertain effects when retained batches are eventually retried. Opening a breaker supplies no duplicate protection.

## Sources

- [Michael Nygard: Release It! Second Edition](https://pragprog.com/titles/mnee2/release-it-second-edition/) — publisher catalog lists Circuit Breaker among the stability patterns.
- [Martin Fowler: Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html) — failure observation, tripping, recovery trials, and Nygard attribution.
- [Microsoft: Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) — state model, classification, resource differentiation, and failure containment.
- [Resilience4j: CircuitBreaker](https://resilience4j.readme.io/docs/circuitbreaker) — windows, minimum samples, slow calls, probe limits, and separate concurrency controls.
- [Polly: Circuit breaker resilience strategy](https://www.pollydocs.org/strategies/circuit-breaker.html) — retained per-authority pipelines, lazy half-open transitions, and separation from retries.
- [AWS: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — retry load, uncertain effects, and operational costs of modal recovery behavior.

The warehouse scenarios, virtual-time implementation, thresholds, output, fallback versions, and diagrams are original teaching material.
