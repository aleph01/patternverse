---
id: data-exponential-backoff-with-jitter
type: pattern
title: Exponential Backoff with Jitter
summary: Increase retry wait limits after eligible failures and randomize each wait, spreading recovery traffic while keeping attempts and total elapsed time bounded.
status: published
aliases:
  - Retry with Backoff and Jitter
  - Exponential Backoff and Jitter
tags:
  - data-engineering
  - execution-recovery
  - software-engineering
  - reliability
verses:
  - software-engineering
  - data-engineering
attribution: Marc Brooker’s AWS analysis establishes the full-jitter mechanism; AWS and HTTP documentation support retry safety and limits. Revised Patternverse article preserving its canonical ID and extraction-worker context. Original code and native illustrations.
---

## Purpose and problem

Four hundred extraction workers lose access to the same metadata service. Each waits one second and retries. The recovering service receives another burst. The workers then wait two seconds, then four: requests become less frequent but still arrive together.

Immediate retries can turn a short interruption into continuing overload. Identical delays preserve that synchronization. The system needs opportunities to recover without unlimited repetition, duplicate effects, or a sleeping backlog that consumes every worker.

## Core idea

**Widen the waiting range after failures, then independently sample each retry's delay from that range.** Exponential backoff reduces retry pressure; jitter spreads clients that failed together. Retry with Backoff and Jitter is the broader description; this article uses the common capped exponential form.

For full jitter, retry number `k`, starting at zero after the initial attempt, uses an upper bound of `min(cap, base × 2^k)` and a uniform delay between zero and that bound. Equal jitter retains a fixed portion of the delay; decorrelated jitter uses a different recurrence. These distributions are not interchangeable.

With base one second and cap eight seconds, bounds grow through 1, 2, 4, 8, 8. Sampled waits need not increase. A shorter later sample is valid, and clients can still coincide.

![Four clients without jitter retry at elapsed times one, three, and seven seconds. Independent full-jitter draws spread their retry times within the same successive one, two, and four second waiting bounds. Request durations are omitted and the times are illustrative.](../assets/data-engineering/exponential-backoff-with-jitter.svg "Backoff widens the interval between opportunities; jitter breaks repeated alignment. Squares mark retry starts, not successful completions. Both panels use the same elapsed-time scale.")

## How it works

### Decide whether repetition is useful and safe

Classify failures using the dependency's contract. Temporary unavailability may justify another attempt. Malformed requests and persistent permission failures need correction. A timeout after a write is uncertain: the server may have committed before the answer was lost.

Keep the logical operation's identity and content stable across attempts. Batch B42 cannot become a new append merely because the previous response disappeared. Deduplication or another idempotency contract protects effects; random waiting alone does not. Version guards may be needed to avoid overwriting newer state. A retried read can observe a newer version: idempotent does not mean an identical response.

### Own the entire retry policy

Define whether the attempt count includes the original request, a total deadline covering calls and waits, and an attempt timeout limited by remaining time. A delay cap alone never ends a retry loop. Recheck the deadline after waking because timers and scheduling can run late.

Prefer configuring an existing client policy over stacking another loop around it. Three total attempts at each of three independent layers can generate 27 lowest-level calls. Service-wide retry quotas and admission limits control aggregate pressure that independent jitter cannot bound.

Release attempt-owned responses, connections, and locks before waiting. Use cancellation-aware waiting in a live client. Long delays in durable jobs often belong in persisted scheduling state rather than a process held asleep.

## Worked example

### A bounded read with observable accounting

The extraction worker retries an idempotent metadata read. The following Python 3.11+ **virtual-time simulation** makes every wait and remaining allowance visible without contacting a service or sleeping in real time. Save `retry_read.py` and `demo.py` together; run `python3 demo.py`.

The fixed teaching policy allows four attempts total, a 1,000 ms budget, and integer full-jitter windows of 100, 200, and 400 ms. The read callback must account for its duration on the supplied nondecreasing clock and honor its remaining allowance. It returns detached data or releases its resources before raising `TemporaryUnavailable`. Other exceptions stop immediately.

```python
class TemporaryUnavailable(Exception):
    pass


class BudgetExpired(TimeoutError):
    pass


def retry_read(read, clock, rng):
    deadline = clock.now_ms + 1000
    ceiling = 100
    for attempt in range(1, 5):
        remaining = deadline - clock.now_ms
        if remaining <= 0:
            raise BudgetExpired("Read budget expired")
        try:
            value = read(remaining)
        except TemporaryUnavailable as error:
            remaining = deadline - clock.now_ms
            if remaining <= 0:
                raise BudgetExpired("Read budget expired") from error
            if attempt == 4:
                raise
            delay = rng.randint(0, ceiling)
            if delay >= remaining:
                raise BudgetExpired("No time for another attempt") from error
            clock.sleep_ms(delay)
            ceiling = min(400, ceiling * 2)
        else:
            if clock.now_ms >= deadline:
                raise BudgetExpired("Read finished too late")
            return value
```

```python
from random import Random
from retry_read import retry_read, TemporaryUnavailable


class Clock:
    now_ms = 0

    def sleep_ms(self, delay):
        print(f"wait {delay} ms")
        self.now_ms += delay


clock = Clock()
calls = 0


def read(remaining_ms):
    global calls
    calls += 1
    print(f"attempt {calls}: {remaining_ms} ms left")
    clock.now_ms += 20
    if calls < 3:
        raise TemporaryUnavailable("metadata service unavailable")
    return "partition 7"


print("result:", retry_read(read, clock, Random(7)))
print("elapsed:", clock.now_ms, "ms")
```

The seven output lines report attempt 1 with 1,000 ms left, wait 41 ms, attempt 2 with 939 ms left, wait 38 ms, attempt 3 with 881 ms left, `result: partition 7`, and `elapsed: 139 ms`. Three 20 ms reads plus 79 ms waiting consume 139 ms. The seed makes the demonstration reproducible; giving every real client the same seed could recreate synchronization.

No wait follows success or the final allowed failure. A delay consuming all remaining time is rejected rather than shortened to force another request. Equality with the deadline means expired. A callback returning late is rejected, but this synchronous simulation cannot interrupt it while it runs.

### A server-requested delay changes the policy

A partner API returns HTTP 429 with `Retry-After: 30`. HTTP permits a delay in seconds or a date. If the service contract requires at least thirty seconds, a local sample below four seconds cannot override it. One policy is the required wait plus additional spread, when permitted. With only twenty seconds left, stop or defer; do not shorten the required wait. The code above deliberately does not implement HTTP parsing or server-directed delays.

![After an eligible failure, retry only when an attempt remains and the total budget permits the sampled wait. A first full-jitter window is zero through 100 milliseconds, then zero through 200, then zero through 400. Four total attempts permit at most three waits. Permanent failure, exhausted attempts, or exhausted budget ends the operation.](../assets/software-engineering/retry-backoff-jitter-policy.svg "Error classification, attempt limits, and the total deadline govern admission. Jitter chooses when an admitted retry may run; it does not make an unsafe operation safe.")

## When to use it

Use it for documented transient failures, temporary throttling, and shared recovery where repeated work is safe and some latency is acceptable. Measure attempts per operation, recovery after retry, total delay, deadline exhaustion, and retry traffic relative to new work.

One attempt is simpler when failure is permanent or the answer is already too late. Persisted resumption can suit long-running ingestion better than repeating a whole job. Persistent quota violations require less admitted work, not just more polite retries.

## Tradeoffs and common mistakes

Retries cost requests, time, and retained state. Full jitter allows zero or very short delays; it guarantees neither fairness nor a global request-rate ceiling. A generous cap still needs finite attempts and a total budget. Cancellation of a timed-out call does not prove that remote execution stopped, so unbounded overlapping attempts remain dangerous.

Use maintained client behavior where possible. AWS documents error classification, jitter and retry quotas, but current revised SDK behavior requires an opt-in until its rollout becomes the default; verify the installed version and mode. Neither this example's constants nor a particular vendor's defaults are universal tuning advice.

## Related patterns

[[data-bounded-retries|Bounded Retries]] decides when repetition must end. Backoff and jitter determine the spacing of admitted attempts.

[[timeout|Timeout]] limits a wait and supplies a remaining-time boundary; expiry does not establish the remote business outcome.

[[data-idempotent-writes|Idempotent Writes]] protects uncertain write effects across repeated attempts. It addresses safety that a timing policy cannot provide.

[[data-backpressure|Backpressure]] reduces admitted work when downstream capacity is insufficient. Jitter spreads retries while backpressure also governs incoming load.

## Sources

- [Marc Brooker: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — capped backoff, synchronized contention, and full, equal, and decorrelated jitter.
- [AWS: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — uncertain effects, retry amplification, budgets, and resource pressure.
- [AWS SDKs: Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) — implemented classification, quotas, modes, and rollout qualifications.
- [RFC 6585, section 4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) — HTTP 429 and optional Retry-After.
- [RFC 9110, sections 9.2.2 and 10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3) — retry safety and Retry-After forms.
- [Python: random](https://docs.python.org/3.11/library/random.html#random.randint) — inclusive uniform integer draws and seeded generators.

The worker scenario, sample times, virtual-time code, policy constants, and diagrams are original teaching material.
