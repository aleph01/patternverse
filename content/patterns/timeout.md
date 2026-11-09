---
id: timeout
type: pattern
title: Timeout
summary: Limit how long an operation may wait, then take an explicit failure path without assuming that the underlying work stopped or had no effect.
status: published
aliases:
  - Timeouts
tags:
  - software-engineering
  - reliability
  - deadlines
  - cancellation
verses:
  - software-engineering
attribution: Timeouts appears among Michael Nygard’s Release It! stability patterns; AWS, gRPC and Python documentation support the operational distinctions. Original Patternverse quote-budget example and native illustrations.
---

## Purpose and problem

A checkout page asks an inventory service for availability and a shipping service for a delivery price. Shipping stops responding. The checkout still holds a request slot and a connection while the customer waits. Enough stalled calls can exhaust the caller even though its own code is healthy.

Waiting longer might produce an answer, but an answer arriving after the customer has left may have little value. The caller needs a limit and a defined response when that limit is reached. It also needs to know what the limit actually covers: queueing, connection setup, the reply, or the whole checkout operation.

## Core idea

**Give waiting a finite budget and make expiry an ordinary outcome.** The owner chooses the budget, an enforcement mechanism observes it, and the caller handles expiry deliberately. That might mean reporting unavailability, returning an explicitly incomplete result, or offering a job-status lookup.

Michael Nygard catalogs **Timeouts** as a stability pattern. A **timeout** is a duration; a **deadline** is the point after which work is no longer timely. Converting one total budget into one deadline prevents each nested step from silently receiving a fresh allowance. Neither term means that a remote side effect has been undone.

![A quote has one 300 millisecond budget. Inventory consumes the first 120 milliseconds, leaving shipping 180 milliseconds until the same deadline. Giving shipping a fresh 300 milliseconds would extend the operation to 420 milliseconds. Queueing and setup must be explicitly included or excluded from the chosen boundary.](../assets/software-engineering/timeout-budget.svg "One operation, one deadline: later stages inherit the remaining allowance. The numbers are illustrative budget accounting, not benchmark results or a recommended production setting.")

## How it works

### Name the boundary and its owner

A connection timeout governs establishing a connection. A read-idle timeout may govern silence between reads and reset whenever data arrives. Neither necessarily limits an entire response. A total operation budget must include every phase that matters, including local queue waits and connection setup if those are inside its boundary.

Prefer the client's supported deadline or timeout controls, then verify their coverage. For elapsed time within one process, use a monotonic clock. A local clock reading is not portable to another machine: propagate a remaining duration or a protocol-supported deadline with defined clock handling. gRPC documents this conversion and the need to stop separately spawned server work.

### Separate expiry from cancellation and completion

When time runs out, stop treating the awaited result as timely. Cancellation is a separate request to stop work. Some APIs cancel an operation; others merely stop waiting. A thread may continue executing, a server may already have committed, and a reply may arrive later. An expired payment request therefore has an uncertain business outcome until reconciled.

Someone must still own pending tasks, buffers, connections, and late replies. Cooperative cancellation should unwind local cleanup before that owner considers the operation finished. A cleanup failure or cancellation-resistant dependency can delay or change the observed outcome. A timeout is not a hard real-time termination mechanism.

## Worked example

### One budget for a two-stage quote

Before the change, inventory and shipping can each wait indefinitely. Giving each a separate 300 ms limit still allows their waits to accumulate. With a shared deadline, 120 ms spent on inventory leaves at most 180 ms for shipping. Reserve response-delivery time separately when the user-facing budget includes it.

The following Python 3.11+ example uses two zero-argument async callables. They run serially in the caller's task; the wrapper creates no detached tasks. Save `quote_budget.py` and `demo.py` together and run `python3 demo.py`. Budgets are numeric milliseconds from 0 through 60,000; Boolean and nonfinite inputs are rejected. These bounds are teaching choices.

```python
import asyncio


async def quote_with_budget(stock, shipping, budget_ms):
    if type(budget_ms) not in (int, float) or not 0 <= budget_ms <= 60_000:
        raise ValueError("Budget must be 0..60000 milliseconds")
    loop = asyncio.get_running_loop()
    deadline = loop.time() + budget_ms / 1000

    def check_deadline():
        if loop.time() >= deadline:
            raise TimeoutError("Quote budget expired")

    check_deadline()
    async with asyncio.timeout_at(deadline):
        available = await stock()
        check_deadline()
        fee = await shipping()
        check_deadline()
        return available, fee
```

```python
import asyncio
from quote_budget import quote_with_budget


async def stock():
    return 2


async def shipping():
    return 500


async def stalled_shipping():
    try:
        await asyncio.Event().wait()
    finally:
        print("shipping: released")


async def main():
    print("fast:", await quote_with_budget(stock, shipping, 1000))
    try:
        await quote_with_budget(stock, stalled_shipping, 100)
    except TimeoutError:
        print("slow: timeout")
    try:
        await quote_with_budget(stock, shipping, 0)
    except TimeoutError:
        print("zero: expired before work")


asyncio.run(main())
```

On a responsive event loop, output is `fast: (2, 500)`, `shipping: released`, `slow: timeout`, then `zero: expired before work`. The tuple means two available items and a shipping fee of 500 cents, not elapsed time. The mocks open no network connections; the release message marks the cleanup path. The stalled dependency yields while waiting; cancellation reaches its `finally` block before the caller handles expiry. Zero expires before either callable starts.

`timeout_at` requests cancellation when the deadline expires and converts its own cancellation into `TimeoutError` outside the context. The explicit clock checks reject an overdue synchronous return and avoid starting shipping after inventory has consumed the budget. They cannot interrupt blocking code while it runs. Other dependency errors propagate; a dependency's own `TimeoutError` is not automatically evidence that this wrapper's timer expired. Production error reporting should preserve that distinction.

![When a deadline expires, the caller takes a timeout path and may request cancellation. A cooperative local dependency releases its resource before reporting timeout. A remote service can commit before cancellation or a late reply arrives; the caller must reconcile that outcome rather than infer rollback.](../assets/software-engineering/timeout-outcome.svg "The timeout boundary governs the caller's willingness to wait. Cancellation, local cleanup, and confirmation of a remote business outcome are distinct events.")

## When to use it

Use Timeout when waiting can outlive an operation's usefulness or retain scarce capacity: dependency calls, pool acquisition, queue admission, and replies to interactive requests. Choose limits from the caller's latency needs and measured dependency behavior under realistic conditions. Track expiries alongside completion latency and remaining capacity.

A direct local calculation with predictable bounded work needs no timer around every function. Long-running work may fit an accepted job and later status query better than one open request. Timeouts also do not replace admission limits when arrivals can exhaust capacity faster than waits expire.

## Tradeoffs and common mistakes

An aggressive limit rejects useful work; a generous one retains resources longer. Repeated retries can multiply load and total latency. Any retry policy needs its own admission and safety rules while staying inside the original operation budget.

Do not treat expiry as permission to repeat a state change blindly. Preserve operation identity and reconcile uncertain results. Never label a missing answer as a confirmed rejection or a fabricated successful zero-price quote.

Swallowing cancellation, blocking the event loop, shielding child work without another owner, or relying on a timed thread join to kill a thread defeats the intended boundary. Cleanup can exceed the nominal budget. The example models cooperative local waiting, not network cancellation, remote rollback, process isolation, or a guaranteed wall-clock return time.

## Related patterns

[[request-reply|Request-Reply]] defines a conversation that expects an answer. Timeout supplies a policy for how long that expectation remains useful and how late replies are handled.

[[data-circuit-breakers|Circuit Breakers]] changes whether later calls are admitted based on dependency health. Timeout limits a particular wait; the admission policy can prevent repeated waits against an unhealthy dependency.

[[idempotent-receiver|Idempotent Receiver]] controls duplicate effects when an uncertain operation is retried with a stable identity. Timeout itself supplies no duplicate protection.

[[scoped-resource-management|Scoped Resource Management]] pairs ownership with cleanup. A cancellation-aware scope can release local resources, while the timer alone cannot establish their final state.

## Sources

- [Michael Nygard: Release It! Second Edition](https://pragprog.com/titles/mnee2/release-it-second-edition/) — publisher catalog lists Timeouts among the stability patterns.
- [Marc Brooker: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — resource retention, timeout selection, phase coverage, and retry risks.
- [gRPC: Deadlines](https://grpc.io/docs/guides/deadlines/) — duration versus deadline, propagation, and server-side cancellation responsibilities.
- [Gráinne Sheerin: gRPC and Deadlines](https://grpc.io/blog/deadlines/) — client and server can disagree about completion after a deadline.
- [Python: Coroutines and Tasks](https://docs.python.org/3.11/library/asyncio-task.html#timeouts) — timeout contexts, cooperative task cancellation, and cleanup.
- [Python: Event Loop](https://docs.python.org/3.11/library/asyncio-eventloop.html#asyncio.loop.time) — the event loop's internal monotonic clock.

The checkout scenario, budget numbers, Python dependencies, code, and diagrams are original teaching material.
