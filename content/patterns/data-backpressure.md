---
id: data-backpressure
type: pattern
title: Backpressure
summary: "Slow or pause upstream admission when downstream work cannot keep up, using feedback to bound buffering instead of letting queues grow without control."
status: published
aliases:
  - Back Pressure
tags:
  - data-engineering
  - streaming-event-processing
  - software-engineering
  - reliability
verses:
  - software-engineering
  - data-engineering
attribution: Established feedback mechanism specified by Reactive Streams and documented by Node.js, Apache Flink and Apache Kafka. Revised canonical Patternverse explanation retaining Data Engineering contexts; original Python example and native illustrations.
---

## Purpose and problem

A pipeline reads 5,000 records per second, but its destination writes only 2,000. Records accumulate while every component reports that it is busy. Garbage collection grows expensive, requests time out, and retries add more work.

The reader should make useful progress without holding everything the destination cannot finish. Simply adding a queue postpones exhaustion. The missing relationship is feedback: downstream capacity must affect what upstream is allowed to admit.

## Core idea

**When the receiver lacks capacity, make the sender slow down or wait; resume when capacity returns.** Back Pressure is a spaced spelling of Backpressure, used in Flink's documentation. A bounded buffer can absorb temporary differences, but feedback governs further admission.

Reactive Streams formalizes a demand-based version: a publisher cannot deliver more elements than its subscriber has requested. That permission is not an acknowledgment of durable business processing. A fixed rate limit is also different: it enforces a configured rate, whereas backpressure responds to receiver capacity.

![Without feedback, a source offering five thousand records per second feeds a sink processing two thousand; a buffer with six thousand free places fills in two seconds. With feedback, downstream capacity limits upstream admission. Data moves downstream while a separate capacity signal travels upstream; excess work remains outside the controlled boundary.](../assets/data-engineering/backpressure.svg "Steady rates of 5,000 in and 2,000 out add 3,000 queued records per second. With 6,000 free places, filling takes two seconds. Feedback changes admission, not processing capacity; remaining work needs an explicit home.")

## How it works

### Account for the work that is still unfinished

A receiver exposes capacity through demand credits, a bounded admission operation, or a readiness signal. The sender must respect it. After completing enough work or freeing a particular buffer, the receiver permits more delivery.

Define what each signal measures. Removing a record from a queue frees a waiting place even while its write remains active. Launching unlimited asynchronous writes after removal creates another unbounded backlog. Bound the relevant waiting entries, bytes, and in-flight operations across the whole path.

During normal operation, an open Node.js writable can accept a chunk yet return `false` to request a pause. Stop subsequent writes until `'drain'`; do not resubmit that chunk as a rejection. Handle errors and closure too, since readiness may never return. Stream pipeline utilities coordinate connected stages. `highWaterMark` is a threshold rather than a strict total memory ceiling; transforms have separate readable and writable buffers.

### Decide where waiting belongs

A file reader can leave bytes unread. A log consumer can leave records in retained storage. A live request may have to wait or receive an explicit refusal. A sensor that cannot pause needs a declared buffering, sampling, dropping, or coalescing policy.

Feedback propagates only across cooperative boundaries. A slow log consumer does not automatically slow every publisher to that log. Kafka producer buffer exhaustion is a separate boundary: admission can block up to `max.block.ms` and then fail; `buffer.memory` excludes some producer memory.

Errors, cancellation, and shutdown must also unblock or terminate waiters. Blocking the only execution thread that can drain a buffer deadlocks progress.

## Worked example

### Read the next chunk only after the write completes

An export reads rows, converts them to CSV, compresses chunks, and writes them to storage. Eagerly reading all rows or scheduling every write defeats streaming. This Python 3.11+ example isolates the simplest feedback boundary: one awaited write controls when the generator advances again.

Save `transfer.py` and `demo.py` together and run `python3 demo.py`. The source is an owned, closeable synchronous generator producing bounded byte chunks incrementally without blocking I/O. The async `write` callback owns its local resources and must finish its protected work and cleanup before returning or raising. Returning while detached writes continue violates that lifetime contract.

```python
from contextlib import closing


async def transfer(source, write):
    completed = 0
    with closing(source):
        for chunk in source:
            await write(chunk)
            completed += 1
    return completed
```

```python
import asyncio
from transfer import transfer


async def main():
    entered, release = asyncio.Event(), asyncio.Event()
    stats = {"read": 0, "bytes": 0, "closed": False}

    def chunks():
        try:
            for chunk in (b"a", b"bb", b"ccc"):
                stats["read"] += 1
                yield chunk
        finally:
            stats["closed"] = True

    async def write(chunk):
        entered.set()
        await release.wait()
        stats["bytes"] += len(chunk)

    task = asyncio.create_task(transfer(chunks(), write))
    try:
        await asyncio.wait_for(entered.wait(), 2)
        print("while blocked:", stats["read"], stats["bytes"])
    finally:
        release.set()
        completed = await task
    print("finished:", completed, stats["bytes"], stats["closed"])


asyncio.run(main())
```

Output is `while blocked: 1 0`, then `finished: 3 6 True`. While the first write waits, only one chunk has been read and zero bytes have completed. Releasing the event lets all three writes finish: three chunks, six bytes, and a closed source. The two-second wait is a demonstration watchdog, not a sink deadline.

![The transfer reads the first chunk and awaits its sink write. While the write is blocked, it does not request chunk two. Completion permits the next read. After all three chunks complete, the generator is closed and the result reports three chunks and six bytes. Failure or cancellation exits through source closing instead of requesting further chunks.](../assets/software-engineering/backpressure-pull.svg "Awaited completion gates the next read in this example. It permits at most one unfinished callback invocation and creates no per-chunk task queue. The sink owns its cleanup; source closing belongs to transfer.")

Ownership begins when the coroutine starts; before that, the caller owns the source. The function is intentionally sequential. It neither creates a worker pool nor enforces a timed rate. It owns source closing on exhaustion, source failure, write failure, or cancellation, assuming closing itself succeeds. The destination's lifetime remains with its caller. No deadline is enforced on a stuck write.

The demo's three literals occupy memory already; a real export needs an incremental source. A blocking reader needs asynchronous I/O or bounded offloading. At most one callback is unfinished, but memory still includes generator state, chunk storage, source prefetch, compression buffers, and the sink's own retained data. Backpressure alone cannot bound all of them.

### A stream processor leaves backlog in a durable log

Flink reports backpressure when a task lacks output buffers. Data travels downstream while capacity constraints propagate upstream; a waiting source can therefore indicate a slower stage farther toward the sink.

The backlog may remain in a log instead of disappearing. At steady illustrative rates, 5,000 arrivals/s and 2,000 completions/s for one minute add 180,000 records. Later, 3,000 completions/s with 1,000 new arrivals/s drain that backlog in about 90 seconds, excluding overhead and retries. Retention and recovery capacity both matter.

## When to use it

Use Backpressure for incremental exports, streams with variable downstream latency, or producers that can wait while receivers catch up. A direct synchronous loop already supplies this feedback when each call truly finishes before the next iteration; no additional protocol is needed for that simple case.

Use a declared overload policy when production cannot pause. Increasing source parallelism is unhelpful when the constrained resource is the destination.

## Tradeoffs and common mistakes

Waiting moves latency and backlog upstream. Storage can exhaust, records can outlive retention, and an upstream producer can hold scarce resources while blocked. Audit every buffer and unfinished operation; releasing an application slot early does not cancel remote work.

Monitor occupancy, oldest-record age, admitted and completed rates, in-flight work, and time waiting for capacity. Feedback delays and overly large buffers can conceal overload. Fairness and per-key ordering need separate policies, and capacity permission should come from a trusted boundary.

The example stops on a failure rather than retrying. Cancellation is cooperative and cannot reverse bytes already written or guarantee remote termination. Backpressure supplies neither durable delivery, duplicate-safe effects, nor global ordering.

## Related patterns

[[producer-consumer|Producer-Consumer]] describes producers, consumers, and their shared buffer; backpressure is the capacity feedback that can govern that collaboration.

[[queue-based-load-leveling|Queue-Based Load Leveling]] buffers temporary bursts and controls downstream drain. Backpressure governs further admission when capacity becomes scarce.

[[data-workload-isolation|Bulkhead]] separates capacity allowances across workloads or dependencies. Backpressure can regulate admission within each allowance.

[[data-freshness-monitoring|Freshness Monitoring]] reveals whether bounded local resources are being maintained at the cost of unacceptable delivery age.

## Sources

- [Reactive Streams 1.0.4 specification](https://github.com/reactive-streams/reactive-streams-jvm/blob/v1.0.4/README.md) — demand bounds, cooperative delivery, and non-pausable sources.
- [Node.js: Streams](https://nodejs.org/api/stream.html) — writable readiness, pipeline coordination, buffering thresholds, and transform buffers.
- [Apache Flink: Monitoring Back Pressure](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/ops/monitoring/back_pressure/) — output-buffer constraints and upstream diagnosis.
- [Apache Kafka 4.1: Producer configurations](https://kafka.apache.org/41/configuration/producer-configs/) — buffer exhaustion, blocking limits, and additional memory use.
- [Python: contextlib.closing](https://docs.python.org/3.11/library/contextlib.html#contextlib.closing) — scope-owned source closing.
- [Python: Asyncio synchronization](https://docs.python.org/3.11/library/asyncio-sync.html#event) — event-controlled suspension and release.
- [Python: Coroutines and Tasks](https://docs.python.org/3.11/library/asyncio-task.html) — awaiting, events, cancellation, and task ownership.

The rates, backlog arithmetic, export scenario, Python experiment, and diagrams are original teaching material.
