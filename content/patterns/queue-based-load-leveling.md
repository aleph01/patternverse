---
id: queue-based-load-leveling
type: pattern
title: Queue-Based Load Leveling
summary: Buffer bursty requests in a queue and control the aggregate drain so downstream work proceeds within a sustainable budget.
status: published
aliases:
  - Queue-Based Load Levelling
  - Queue Based Load Leveling
tags:
  - software-engineering
  - reliability
  - queues
  - asynchronous-processing
verses:
  - software-engineering
attribution: Established pattern documented by Microsoft Azure Architecture Center; operational boundaries supported by AWS, RabbitMQ, IETF and Python documentation. Original Patternverse report-generation scenario, bounded simulation and native illustrations.
---

## Purpose and problem

At nine o'clock, hundreds of customers request downloadable reports. The API immediately starts a database query for each request. The database can handle the day's total work, but not all those queries together. Interactive pages slow down while report requests time out and customers try again.

The reports can arrive a little later; the database cannot grow instantly. The system needs to accept a tolerable burst without turning that burst into simultaneous downstream work. It also needs to tell customers whether a report was merely accepted or actually finished.

## Core idea

**Store requests between intake and execution, then drain them within the target's sustainable budget.** Microsoft catalogs this as Queue-Based Load Leveling. The British spelling, load levelling, names the same pattern. Load balancing distributes traffic across service instances; load leveling buffers work so it can be handled later.

The queue moves some demand through time. It does not manufacture throughput. The design includes both storage and controlled consumption: an unlimited consumer fleet can reproduce the original overload after the queue.

![Bursty producers enqueue jobs into a six-place waiting buffer. A controlled handler transfers work toward the target using a two-job budget per one-second model tick. Confirmed admission and completed work are distinct outcomes. Queue capacity, drain budget, and target capacity are separate controls.](../assets/software-engineering/queue-based-load-leveling-flow.svg "The queue separates arrival from execution. Arrows mean work transfer; the handler's aggregate drain must fit downstream capacity. The six-place buffer and two-job tick budget belong to the teaching model.")

## How it works

### Accept a job, then own its outcome

The intake path validates the request, identifies its authorized owner, and submits a complete job or a stable reference to retained input. If accepted work must survive a crash, choose durable storage and understand its confirmation and retention contract. An in-memory collection alone cannot supply that promise.

An HTTP API might return `202 Accepted` with a job identifier and status location. RFC 9110 distinguishes that acceptance from completion. Publishing to a broker is another separate boundary: RabbitMQ publisher confirms do not report whether a consumer has finished the business operation.

A worker receives work, performs the operation, records its outcome, and acknowledges or deletes the delivery according to the broker's protocol. Resources such as database connections belong to the processing lifetime. Close them on failures as well as success; do not hold them while a job waits in the queue.

### Bound the whole path

Specify waiting capacity, message size, retention, and what happens when admission fails. Rejection, upstream slowing, or durable deferral are deliberate policies. Silently discarding an accepted report is not load leveling.

Limit aggregate downstream demand, including all workers and retries. A concurrency cap and a rate budget are different controls: ten very fast workers can issue many requests per second. Likewise, one job making five database calls consumes more downstream work than one making a single call. Prefetch limits deliveries held by consumers, not necessarily requests per second; RabbitMQ documents its particular scope and acknowledgment behavior.

## Worked example

### Eight reports over four virtual seconds

Previously, six arrivals in the first second could start six competing queries. Now a queue admits those six reports, and a controlled handler completes two per tick. Two more arrive in the second tick. All eight finish within four model ticks while the per-tick budget remains two.

Save `leveling.py` and `demo.py` together and run `python3 demo.py` with Python 3.11+. This is a bounded simulation, not a broker or live rate limiter. Each tick represents one second: arrivals are admitted at its start, then up to `budget` unit-cost jobs complete by its end. No execution spans ticks. Capacity counts queued entries before that tick's drain; admission cannot use space that will become free later.

```python
from collections import deque


def simulate(arrivals, budget=2, capacity=6):
    if type(arrivals) is not tuple or any(
        type(n) is not int or n < 0 for n in arrivals
    ):
        raise ValueError("Supply a finite tuple of nonnegative counts")
    if type(budget) is not int or budget < 0:
        raise ValueError("Budget must be a nonnegative integer")
    if type(capacity) is not int or capacity < 1:
        raise ValueError("Capacity must be a positive integer")
    pending, rows = deque(), []
    for tick, incoming in enumerate(arrivals, 1):
        accepted = min(incoming, capacity - len(pending))
        pending.extend((tick, i) for i in range(accepted))
        done = min(budget, len(pending))
        for _ in range(done):
            pending.popleft()
        rows.append((tick, incoming, accepted,
                     incoming - accepted, done, len(pending)))
    return rows
```

```python
from leveling import simulate

print("tick in accepted rejected done waiting")
for row in simulate((6, 2, 0, 0)):
    print(*row)
```

After the header, output is `1 6 6 0 2 4`, `2 2 2 0 2 4`, `3 0 0 0 2 2`, and `4 0 0 0 2 0`. Counts are jobs, and waiting is measured after that tick's completions. Each row conserves work: previous waiting plus accepted equals done plus new waiting.

![Four one-second ticks show arrivals of six, two, zero, and zero jobs. All are admitted without rejection. Each tick completes two jobs, leaving four, four, two, and zero waiting. Accepted jobs total eight, completed jobs total eight, and the final backlog is empty.](../assets/software-engineering/queue-based-load-leveling-trace.svg "This trace matches the runnable simulation. Arrivals are admitted before draining; waiting is sampled at the end of each tick. Two completions per tick smooth the initial six-job burst across four ticks.")

### A queue that cannot catch up

With `simulate((4, 4, 4, 4))`, completions remain two per tick, but four jobs are rejected overall and four remain waiting. With `budget=0`, an outage consumes waiting capacity without completing anything. The model never drains beyond its supplied horizon; append zero-arrival ticks with a positive budget to observe recovery.

These outcomes expose the capacity decision rather than hiding it in an ever-growing queue. The model assumes every admitted job succeeds. It has no persistence, acknowledgment protocol, concurrent workers, payload-byte accounting, real clock, or external effects. Its finite input tuple and returned trace also occupy memory outside the queue. FIFO removal here does not promise completion order in a real parallel deployment.

## When to use it

Use it when demand is bursty, processing can wait, and the backlog can drain within the business deadline. Report generation, document conversion, and deferred synchronization are recognizable examples. Size storage and operating budgets for measured bursts and recovery, not just daily averages.

A direct call is simpler for low, steady traffic or an operation whose caller needs the result immediately. If sustained arrivals exceed safe processing capacity, choose more sustainable capacity or less admitted work. A larger queue buys time, not a solution to that imbalance.

## Tradeoffs and common mistakes

AWS's backlog guidance emphasizes message age: quick intake can conceal a badly delayed service. Monitor oldest-job age, time to useful completion, accepted and rejected counts, in-flight work, retry volume, and downstream saturation. Expiration must become an observable outcome, not invisible success.

Failures can also repeat work. SQS documents redelivery after an uncompleted visibility interval and possible duplicates even in standard delivery. A worker can commit an effect and crash before acknowledgment; design repeated attempts around stable job identity and idempotent effects. Bound retries and route persistent failures for investigation instead of circulating them indefinitely.

A FIFO intake does not establish global business ordering when jobs run concurrently or return through retries. Shutdown must stop new intake and finish or safely return owned deliveries. Restrict enqueueing, consuming, and status access separately, and retain sensitive input only as long as the service contract requires.

## Related patterns

[[producer-consumer|Producer-Consumer]] describes the buffer and participants. Queue-Based Load Leveling uses that collaboration specifically to reshape downstream demand over time.

[[data-backpressure|Backpressure]] slows upstream admission when capacity is scarce. It complements buffering when the queue approaches its limit.

[[data-workload-isolation|Bulkhead]] reserves separate capacity allowances for workload classes or dependencies. Load leveling spreads demand through time; a shared queue alone does not protect urgent work from a large backfill.

[[idempotent-receiver|Idempotent Receiver]] protects business effects when a delivery is repeated. Buffering and controlled consumption do not themselves prevent duplicates.

## Sources

- [Microsoft: Queue-Based Load Leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling) — established name, buffered intake, controlled consumption, and applicability.
- [AWS: Avoiding insurmountable queue backlogs](https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs) — backlog debt, recovery, message age, and admission policies.
- [RabbitMQ: Consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms) — separate confirmations, unacknowledged deliveries, and prefetch limits.
- [Amazon SQS: Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) — in-flight ownership, deletion, and redelivery after expiry.
- [Amazon SQS: At-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html) — duplicate delivery and idempotent processing.
- [IETF: RFC 9110, 202 Accepted](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3) — acceptance, incomplete processing, and status monitoring.
- [AWS: Elastic Load Balancing](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html) — distributing traffic across targets, distinct from buffering demand through time.
- [Python: collections.deque](https://docs.python.org/3.11/library/collections.html#collections.deque) — the simulation's append and FIFO removal operations.

The report scenario, one-second phase convention, chosen capacities, overload cases, code, and native diagrams are original teaching material.
