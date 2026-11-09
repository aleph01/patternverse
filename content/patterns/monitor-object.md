---
id: monitor-object
type: pattern
title: Monitor Object
summary: Encapsulate shared state behind synchronized methods, using a monitor lock for exclusive access and condition waiting for state-dependent progress.
status: published
aliases:
  - Thread-safe Passive Object
tags:
  - software-engineering
  - concurrency
  - synchronization
  - condition-variables
verses:
  - software-engineering
attribution: Monitor Object pattern by Douglas C. Schmidt; official Python and Java documentation. Original Patternverse bounded inbox, closing policy, and native illustrations.
---

## Purpose and problem

Several producers feed small jobs to a bounded inbox while consumers remove them. A producer must stop when the inbox is full; a consumer must stop when it is empty. Checking the length and then updating the buffer without synchronization lets competing callers overfill it or remove the same available work.

A mutex prevents overlapping updates, but waiting for an item while holding that mutex prevents producers from adding one. The inbox needs both exclusive state access and a way to wait for a state change without preventing that change.

## Core idea

**Keep the state, its lock, and its waiting rules together.** A Monitor Object exposes synchronized methods that preserve one object's invariants. A condition variable lets a caller release the monitor lock while waiting, then reacquire it before examining state again.

Schmidt also calls this a **Thread-safe Passive Object**. “Passive” matters: the caller's thread executes the method. The object does not require a dedicated worker or a queue of method invocations. The inbox's deque below contains job data, not deferred method calls. “Monitor” here describes synchronization, rather than observability or health monitoring.

![Producer and consumer caller threads enter synchronized put, get, and close methods through one shared monitor lock. The protected inbox contains a bounded deque and a closed flag. A condition wait releases that same lock; a returning waiter reacquires it and rechecks the state predicate.](../assets/software-engineering/monitor-object-boundary.svg "The lock protects the complete check-and-update operation. Waiting temporarily leaves the protected region; the method invocation remains pending on its caller's thread.")

## How it works

### Synchronize predicates and mutations together

The object's protected state and synchronized methods form one boundary. All access paths must use its monitor lock, including reads used to decide whether an operation is allowed. A lock around mutation alone does not make an earlier unlocked check safe.

For this inbox, the invariant is `0 <= item count <= capacity`. A producer may insert when there is space and admission remains open. A consumer may remove when data exists. Each check and its corresponding mutation happen under the same lock, so another caller cannot invalidate the decision between them.

When a predicate is false, condition waiting releases the associated lock and suspends the caller. Another thread can then enter a method and change state. On return from waiting, the original caller holds the lock again. Reestablish invariants before waiting, just as before returning, because another method can execute during that interval.

### Notification is a prompt to recheck

Python's `Condition.notify_all()` wakes waiters but does not release the lock or transfer ownership to them immediately. A waiter must reacquire the lock, and another caller may already have changed the state. Waits can also return without the desired predicate becoming true. Use a `while` predicate loop, not a one-time `if` test. Java's `Object.wait` documentation similarly requires condition checks in a loop; monitor APIs differ, so do not assume an immediate handoff policy.

The example uses one condition for both “not empty” and “not full,” plus closure. It notifies all waiters after relevant changes so every waiter class can recheck. Separate conditions sharing one lock can reduce unnecessary wakeups, but require careful notification choices. A condition notification is not stored as a consumable item: durable knowledge belongs in protected state.

![A consumer finds an empty inbox, waits, and releases the lock. A producer acquires it, inserts one item, and notifies while retaining the lock. Only after the producer releases can the consumer reacquire. The consumer rechecks the predicate before removing an item, or waits again if it is still false.](../assets/software-engineering/monitor-object-wait.svg "Notification makes a waiter eligible to run; it does not reserve an item. Rechecking under the lock handles changed state and extra wakeups without violating the buffer invariant.")

## Worked example

### A bounded inbox that can close

Save `monitor_inbox.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Capacity is a positive integer number of items. Items are immutable byte strings of 0–8 bytes, including a valid empty item. One plain `Lock` is shared by the condition and every state access. Blocking calls have no timeout in this small API.

```python
from collections import deque
from threading import Condition, Lock


class Closed(Exception):
    pass


class MonitorInbox:
    def __init__(self, capacity=2):
        if type(capacity) is not int or capacity < 1:
            raise ValueError("Capacity must be a positive item count")
        self._capacity = capacity
        self._items = deque()
        self._closed = False
        self._changed = Condition(Lock())

    def put(self, item):
        if type(item) is not bytes or len(item) > 8:
            raise ValueError("Supply an immutable item of 0..8 bytes")
        with self._changed:
            while len(self._items) == self._capacity and not self._closed:
                self._changed.wait()
            if self._closed:
                raise Closed("Inbox no longer accepts items")
            self._items.append(item)
            self._changed.notify_all()

    def get(self):
        with self._changed:
            while not self._items and not self._closed:
                self._changed.wait()
            if not self._items:
                raise Closed("Inbox is closed and drained")
            item = self._items.popleft()
            self._changed.notify_all()
            return item

    def close(self):
        with self._changed:
            self._closed = True
            self._changed.notify_all()
```

```python
from threading import Thread
from monitor_inbox import Closed, MonitorInbox

inbox = MonitorInbox(capacity=2)
received = []


def consume():
    try:
        while True:
            received.append(inbox.get())
    except Closed:
        return


consumer = Thread(target=consume, daemon=False)
consumer.start()
try:
    inbox.put(b"red")
    inbox.put(b"blue")
finally:
    inbox.close()
    consumer.join()
print("received:", received)
try:
    inbox.put(b"late")
except Closed:
    print("after close: rejected")
try:
    inbox.get()
except Closed:
    print("drained: closed")
```

Output is `received: [b'red', b'blue']`, `after close: rejected`, and `drained: closed`. The consumer is a client thread created by the demonstration, not a worker owned by the monitor. The main thread reads its result list only after joining it.

Closing rejects new puts and wakes blocked producers and consumers. Buffered items remain available; after the last removal, `get` raises `Closed`. Thus a blocked put cannot insert after closure, while already accepted data can drain. Empty bytes are data, so closure uses a separate state and exception. Closing does not join client threads, interrupt their outside work, or acknowledge completion of removed jobs.

## When to use it

Use Monitor Object when several threads need a cohesive shared object with synchronous methods, stable invariants, and predicates that sometimes require waiting. Bounded buffers, local resource pools, and coordination gates can fit this collaboration.

If a short operation only needs mutual exclusion, a lock without condition waiting may suffice. If the standard `queue.Queue` already provides the required contract, use it rather than reproducing synchronization machinery. A separate execution owner is a different choice when callers should submit work instead of executing methods themselves.

## Tradeoffs and common mistakes

Keep protected regions short. Slow I/O, arbitrary callbacks, or waiting while holding unrelated locks can block the threads needed for progress. The example's plain lock is not reentrant: calling one public method from another while holding it can deadlock. Reentrant locking alone would not make every intermediate state valid.

Do not expose mutable internal state or split one invariant across unrelated locks. Multiple monitor objects need a deliberate lock-order or higher-level protocol; one monitor cannot make their combined updates atomic.

FIFO removal does not guarantee fair access among waiting threads, FIFO completion of job processing, or immunity from starvation. `notify_all` can cause contention when many threads wake together. This implementation provides no deadlines, cancellation, durable storage, or recovery if a consumer fails after removing an item. An exception does not roll back earlier effects.

## Related patterns

[[active-object|Active Object]] separates invocation from execution through queued method requests and a scheduler. Monitor Object instead lets callers execute synchronized methods directly.

[[reactor|Reactor]] dispatches readiness handlers on a loop. A blocking monitor wait inside a handler can stall that loop; the surrounding execution model still matters.

[[observer|Observer]] notifies subscribed dependents of changes. Monitor condition notification coordinates waiting callers under a shared locking protocol; it is not a substitute for that protocol.

## Sources

- [Douglas C. Schmidt: Monitor Object](https://www.dre.vanderbilt.edu/~schmidt/PDF/monitor.pdf) — established pattern, passive-object alias, monitor lock, synchronized methods, and condition coordination.
- [Schmidt and coauthors: POSA Volume 2](https://www.dre.vanderbilt.edu/~schmidt/POSA/POSA2/) — concurrent and networked pattern catalog context.
- [Python: Condition objects](https://docs.python.org/3.11/library/threading.html#condition-objects) — release/reacquire behavior, predicate loops, and notification semantics.
- [Java: Object.wait and notification](https://docs.oracle.com/javase/8/docs/api/java/lang/Object.html) — another documented monitor API with condition rechecking and spurious-wakeup considerations.
- [Python: queue](https://docs.python.org/3.11/library/queue.html) — synchronized bounded queues as an existing implementation alternative.

The inbox, byte limits, closing policy, demonstration, and diagrams are original teaching material.
