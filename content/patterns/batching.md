---
id: batching
type: pattern
title: Batching
summary: Group compatible operations into bounded execution units to share fixed overhead, with explicit limits on size, waiting, and completion semantics.
status: published
aliases: []
tags:
  - software-engineering
  - performance-and-scalability
  - buffering
verses:
  - software-engineering
attribution: "Established batching techniques documented by Microsoft, Google Cloud, and AWS. Original Patternverse telemetry scenario, bounded batch-formation program, cost model, and native illustrations."
---

## Purpose and problem

A telemetry client sends each reading in a separate remote call. Every call repeats framing, serialization setup, scheduling, and a network round trip. The payload is tiny, but fixed overhead consumes much of the work. More concurrent calls increase pressure without removing that repeated cost.

The client could collect readings before sending them. That saves calls, but the first reading must wait for companions. At low traffic, a count-only buffer might wait indefinitely. Large groups also consume memory and make failures affect more work at once.

## Core idea

**Batching groups compatible operations so one execution unit shares overhead that would otherwise be paid repeatedly.** Members can remain separate logical operations with separate outcomes. A batch need not aggregate their meaning, run them concurrently, or commit them atomically.

Think **collect within limits, emit together, resolve outcomes deliberately**. The shared cost might be a network request, database commit, scheduling step, or accelerator invocation. The destination must actually support efficient grouped work; a wrapper that merely loops over unchanged expensive calls may save little.

Batching is the established general technique. Microbatch Processing and Batch Serving are more specific architectures, not aliases for every buffered bulk request.

![Seven individual calls would each pay five milliseconds of fixed overhead plus one millisecond per item, totaling 42 milliseconds of modeled service work. The example emits four batches containing three, one, one, and two items, totaling 27 milliseconds under the same assumptions. Collection waiting is excluded.](../assets/software-engineering/batching-cost.svg "This is an illustrative additive cost model, not a latency benchmark. Seven items remain seven operations; four batches pay the fixed cost four times. Waiting, contention, and destination behavior determine actual response time.")

## How it works

### Bound formation and outstanding work

Group only compatible destinations, authorization contexts, encodings, and operation semantics. An authorization check for one member must not authorize its neighbors. Preserve each member’s identity when results require correlation.

A collector commonly emits when a count or byte threshold is reached, or the oldest pending item reaches its age limit. An age deadline needs a timer or another progress mechanism even when traffic stops. Repeated arrivals should not keep resetting the oldest item’s deadline.

Count limits do not bound bytes. Measure the serialized representation that the destination constrains, including envelope overhead where applicable. Define how to handle a single oversized item: reject, route separately, or split only if semantics permit.

The collector owns pending items until handoff. The sender then owns outstanding batches and their outcomes. Bounding one collector does not bound all collectors, emitted batches, response buffers, or retries. Apply admission control or backpressure when the destination cannot keep up. Stop accepting work and drain or explicitly abandon residual items during shutdown.

### Grouping supplies no transaction guarantee

A successful envelope can contain failed members. Microsoft Graph returns individual response statuses; its outer HTTP 200 does not establish success for every request, and responses can arrive in another order. Correlate by identity rather than array position.

A transport failure can leave outcomes unknown. Retry known-unprocessed members according to policy; an ambiguous outcome requires safe repeatability or reconciliation. Grouping a debit with other debits does not make replay safe. Ordering and atomicity come from the destination’s documented contract, not the word “batch.”

## Worked example

### A small collector with four emission causes

Before batching, seven readings require seven calls. Afterward, the collector emits groups according to count, payload size, age, and final drain. With a hypothetical fixed cost of **5 milliseconds per call** plus **1 millisecond per item**, service work changes from `7 × 5 + 7 = 42 ms` to `4 × 5 + 7 = 27 ms`. Collection waiting is additional.

Save this Python 3 program as `batching.py` and run `python3 batching.py`. One caller supplies nondecreasing, nonnegative integer **milliseconds on a simulated monotonic clock**. Payloads are immutable, nonempty byte strings. Limits are three items, six payload bytes, and ten milliseconds from the oldest pending arrival.

```python
class Batcher:
    def __init__(self, max_items=3, max_bytes=6, max_age_ms=10):
        if any(type(n) is not int or n < 1
               for n in (max_items, max_bytes, max_age_ms)):
            raise ValueError("positive integer limits required")
        self.max_items, self.max_bytes = max_items, max_bytes
        self.max_age_ms = max_age_ms
        self.pending, self.size, self.started = [], 0, None
        self.now, self.closed = 0, False

    def _emit(self, reason):
        if not self.pending:
            return []
        batch = (self.now, reason, tuple(self.pending))
        self.pending, self.size, self.started = [], 0, None
        return [batch]

    def advance(self, now_ms):
        if self.closed:
            raise RuntimeError("collector closed")
        if type(now_ms) is not int or now_ms < self.now:
            raise ValueError("nondecreasing integer milliseconds required")
        self.now = now_ms
        if self.pending and now_ms - self.started >= self.max_age_ms:
            return self._emit("age")
        return []

    def add(self, payload, now_ms):
        if type(payload) is not bytes or not 0 < len(payload) <= self.max_bytes:
            raise ValueError("nonempty payload must fit the byte limit")
        batches = self.advance(now_ms)
        if self.size + len(payload) > self.max_bytes:
            batches += self._emit("size")
        if not self.pending:
            self.started = now_ms
        self.pending.append(payload)
        self.size += len(payload)
        if len(self.pending) == self.max_items:
            batches += self._emit("count")
        elif self.size == self.max_bytes:
            batches += self._emit("size")
        return batches

    def close(self, now_ms):
        batches = self.advance(now_ms) + self._emit("close")
        self.closed = True
        return batches


if __name__ == "__main__":
    collector = Batcher()
    emitted = []
    for time_ms, payload in [(0, b"a"), (4, b"bb"), (8, b"c"),
                             (12, b"dddd"), (13, b"eee")]:
        emitted += collector.add(payload, time_ms)
    emitted += collector.advance(23)
    emitted += collector.add(b"f", 24)
    emitted += collector.add(b"g", 25)
    emitted += collector.close(26)
    for time_ms, reason, items in emitted:
        print(time_ms, reason, [p.decode("ascii") for p in items],
              sum(map(len, items)))
```

The four output lines are `8 count ['a', 'bb', 'c'] 4`, `13 size ['dddd'] 4`, `23 age ['eee'] 3`, and `26 close ['f', 'g'] 2`. Fields mean emission time in milliseconds, cause, members, and total payload bytes. Adding `eee` would exceed six bytes with `dddd`, so the old group emits before the new item enters it. The idle-time `advance(23)` emits `eee` without another arrival.

Age is checked before admitting a new item; equality emits the old group. Count wins if count and byte equality coincide. Invalid payloads are rejected before clock or buffer changes. An emitted tuple transfers responsibility to the caller; it is not a send acknowledgment or durable record.

![The program emits a, bb, and c at 8 milliseconds because three items have accumulated. At 13 milliseconds it emits dddd before adding eee because seven bytes would exceed the six-byte limit. At 23 milliseconds eee reaches ten milliseconds of age. Closing at 26 milliseconds emits the remaining f and g.](../assets/software-engineering/batching-triggers.svg "Count and byte limits can emit early; age releases a partial group when traffic stops; close drains the residual group. Ten milliseconds is a formation policy checked by advance, not a guaranteed delivery deadline.")

This example forms batches but performs no network or database operations. It has no real timer, concurrency, persistence, retry, or completion tracker. Payload bytes exclude framing. If `advance` runs late, emission runs late; a slow sender adds more delay. Returned groups and the demo’s accumulated output are outside the pending-buffer bound.

### Bulk writes can partly succeed

DynamoDB’s `BatchWriteItem` makes individual puts and deletes atomic, while the whole batch is not atomic. It returns known unprocessed items for selective retries with backoff. If no reliable response arrives, that distinction cannot reveal which effects occurred. The collector’s emission boundary therefore cannot replace the destination’s recovery contract.

## When to use it

Use batching when measurements show significant repeatable overhead, the destination supports grouped execution, and callers can tolerate some collection delay. Bulk ingestion and high-volume remote APIs are common signals.

Keep immediate individual operations when demand is sparse, deadlines are tight, or grouping saves little. A batch size of one is a legitimate low-delay policy, not a performance failure.

## Tradeoffs and common mistakes

Larger batches trade fewer fixed costs for more waiting, memory, failure scope, and sometimes lock duration. Measure batch fill, oldest-item age, end-to-end latency, payload bytes, partial failures, and outstanding work. Bigger is not automatically better.

Common mistakes include count-only flushing at low traffic, ignoring the final partial group, assuming outer success means member success, replaying successful members, and confusing fewer requests with fewer business operations or reduced billing. Several batching layers can also add their waiting budgets together.

## Related patterns

[[data-microbatch-processing|Microbatch Processing]] runs a stream as recoverable bounded executions with recorded progress. General batching need not provide replay or checkpointing.

[[ml-batch-serving|Batch Serving]] precomputes predictions for later consumption. Batching online inference requests can share execution overhead while still answering current requests.

[[aggregator|Aggregator]] combines related messages into a meaningful result using completion rules. A throughput batch can contain independent operations and preserve separate results.

[[data-backpressure|Backpressure]] feeds downstream capacity limits back into admission. Batch formation limits alone do not constrain all outstanding work.

## Sources

- [Microsoft: Use batching to improve application performance](https://learn.microsoft.com/en-us/azure/azure-sql/performance-improve-use-batching?view=azuresql) — shared fixed costs and buffering by size or elapsed time.
- [Google Cloud: Batch messaging](https://docs.cloud.google.com/pubsub/docs/batch-messaging) — publisher count, byte, and latency settings.
- [Microsoft Graph: JSON batching](https://learn.microsoft.com/en-us/graph/json-batching) — per-member identities, statuses, and response ordering.
- [AWS: BatchWriteItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html) — individual versus whole-batch atomicity and unprocessed-item retries.

The telemetry scenario, exact limits and arrivals, executable collector, additive cost assumptions, and diagrams are original teaching material.
