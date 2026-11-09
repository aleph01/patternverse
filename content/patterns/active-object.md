---
id: active-object
type: pattern
title: Active Object
summary: Turn method invocations into queued requests and execute them through an object's scheduler, keeping its state under one execution owner and returning results separately.
status: published
aliases:
  - Concurrent Object
tags:
  - software-engineering
  - concurrency
  - ownership
  - asynchronous-methods
verses:
  - software-engineering
attribution: Active Object pattern by R. Greg Lavender and Douglas C. Schmidt; official Python and Akka documentation. Original Patternverse stock-owner implementation and native illustrations.
---

## Purpose and problem

Several request-handling threads update a warehouse's available stock. Each must check that removing items will not make the quantity negative. Putting a lock around every access can preserve that rule, but callers still execute the stock object's work themselves. A slow operation holds up its caller, and every new access path must remember the same synchronization discipline.

The service needs to separate asking for a stock change from executing it. It also needs one authority over the quantity, a policy for waiting requests, and an explicit way to report success or failure later.

## Core idea

**Queue the invocation; let the object own execution.** An Active Object exposes a proxy that packages calls as method requests. A scheduler selects requests and invokes the object's implementation, traditionally called the servant, in its own execution context. A future can carry each result back to the caller.

Lavender and Schmidt also use **Concurrent Object** and **Actor**. This article keeps Concurrent Object as an alias. The modern actor model overlaps in independent execution and message-based state isolation, but its broader messaging and supervision semantics should not be inferred from a method proxy and future.

![Clients invoke the stock proxy, which creates requests containing an immutable quantity change and a future. A bounded activation queue passes requests to one worker scheduler. Only that worker accesses the stock quantity and resolves each future with a result or error.](../assets/software-engineering/active-object-owner.svg "Invocation happens on a caller thread; stock execution happens on the owner thread. The queue transfers a request, not permission for callers to access the servant's state directly.")

## How it works

### Make scheduling and state ownership explicit

The **proxy** defines the public methods. A **method request** captures the operation, argument values, and result destination. The **activation queue** holds pending requests. The **scheduler** decides when to execute them; the **servant** owns the behavior and state. A **future** represents a result that may not yet exist.

FIFO is one scheduling choice. The original pattern also supports guards that postpone requests until synchronization conditions hold. The example below executes every admitted request in FIFO order and rejects invalid stock changes; it does not postpone them behind guards. Concurrent callers are ordered by accepted enqueue operations, not by when their calls began.

State isolation requires discipline: callers must not retain another path into mutable servant state. Capture immutable argument values or transfer/copy mutable data deliberately. A single generic worker pool does not serialize one servant automatically if several workers can execute its requests simultaneously.

### Define admission, results, and stopping

A bounded queue needs a full-queue policy. Here admission is immediate or raises `Full`; two requests may wait while one executes. Queue admission and closure share a lock so no accepted call can slip behind the stop marker. That small control lock does not protect the stock quantity; the worker's ownership does.

The returned future means accepted work, not a completed change. A caller can continue, wait for the result, or observe an exception. Canceling a queued future can prevent execution; once the worker marks it running, cancellation cannot undo it. A result-wait timeout is not cancellation. This example returns immutable integers, leaving internal state private.

Shutdown stops admission, appends a FIFO stop marker, drains accepted requests, and joins a non-daemon worker. It can wait indefinitely if worker code or a completion callback never returns. Never block the owner waiting for another request queued to itself; that request cannot run. Callbacks and lifecycle operations need the same attention as ordinary methods.

![Three admitted changes execute in order. Adding three units returns three. Removing five fails before mutation and returns an error, leaving three units. Adding two then returns five. Shutdown rejects new invocations, drains accepted requests, and joins the worker.](../assets/software-engineering/active-object-results.svg "Serialization protects this servant's check-and-update rule. A failed request does not stop later requests here, and only the example's pre-mutation validation preserves quantity on failure; there is no general rollback guarantee.")

## Worked example

### One stock owner, asynchronous calls

Save `active_stock.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Changes and results are integer item counts; Boolean values are rejected. A zero change queries the quantity through the same queue. Request tuples capture immutable integers and futures. The worker's local `quantity` supplies the servant state; its loop combines scheduler and servant behavior.

```python
from concurrent.futures import Future
from queue import Queue
from threading import Lock, Thread, current_thread


class ActiveStock:
    def __init__(self):
        self._queue = Queue(maxsize=2)
        self._gate = Lock()
        self._closed = False
        self._thread = Thread(target=self._run, daemon=False)
        self._thread.start()

    def change(self, delta):
        if type(delta) is not int:
            raise ValueError("Change must be an integer item count")
        with self._gate:
            if self._closed:
                raise RuntimeError("Stock owner is closed")
            result = Future()
            self._queue.put_nowait((delta, result))
            return result

    def _run(self):
        quantity = 0
        while True:
            request = self._queue.get()
            try:
                if request is None:
                    return
                delta, result = request
                if not result.set_running_or_notify_cancel():
                    continue
                try:
                    if quantity + delta < 0:
                        raise ValueError("negative stock")
                    quantity += delta
                except Exception as error:
                    result.set_exception(error)
                else:
                    result.set_result(quantity)
            finally:
                self._queue.task_done()

    def close(self):
        if current_thread() is self._thread:
            raise RuntimeError("Worker cannot join itself")
        with self._gate:
            send_stop = not self._closed
            self._closed = True
        if send_stop:
            self._queue.put(None)
        self._thread.join()
```

```python
from active_stock import ActiveStock

stock = ActiveStock()
try:
    added = stock.change(3)
    invalid = stock.change(-5)
    print("after +3:", added.result(timeout=2), "units")
    try:
        invalid.result(timeout=2)
    except ValueError as error:
        print("rejected:", error)
    print("after +2:", stock.change(2).result(timeout=2), "units")
finally:
    stock.close()
try:
    stock.change(1)
except RuntimeError:
    print("after close: rejected")
```

Output is `after +3: 3 units`, `rejected: negative stock`, `after +2: 5 units`, and `after close: rejected`. The first two requests fit the two-place queue even if the worker has not started consuming. Validation failure reaches its own future; the next request still executes. The two-second waits bound the demonstration's result waits, not operation execution or shutdown.

This is a small, real threaded executor for one owned state, not a distributed actor runtime. It has no durable mailbox, restart supervision, external I/O, forced interruption, guard scheduling, or cross-object transaction. Clients must use futures for observation/cancellation rather than manually completing them. A canceled request occupies its queue position until the worker removes it.

## When to use it

Use Active Object when callers should hand work to an independently executing state owner: a device controller, a sequential session, or a service with an intentional request backlog. The stock example shows serialized business updates; a device wrapper can use the same boundary to keep slow calls away from request-handling threads.

For short operations where callers can wait, a passive object with a lock is often simpler. An event loop may already provide suitable ownership. Adding a worker to every object can be excessive; execution contexts and queues should match the workload.

## Tradeoffs and common mistakes

The extra queue, result handling, and thread add latency and lifecycle work. One slow method delays that object's later requests. Bound queues and payloads, and decide whether overload rejects, waits, or sheds work.

Do not confuse queue capacity with a bound on all memory: clients can retain arbitrarily many completed futures. Do not expose mutable servant data or reuse argument buffers while queued requests still reference them.

A future timeout or cancellation does not roll back completed effects. Catching an exception is not transaction recovery. Unexpected worker failure needs an explicit policy for unresolved requests; this implementation has no restart mechanism. Thread ownership also does not guarantee CPU parallelism or coordinate another object's state.

## Related patterns

[[command|Command]] supplies a way to represent a method request. Active Object adds an activation queue, scheduling, ownership, and result delivery.

[[proxy|Proxy]] supplies the caller-facing stand-in. Active Object deliberately changes execution timing and exposes deferred results rather than promising transparent synchronous behavior.

[[proactor|Proactor]] dispatches completed asynchronous operations. Active Object schedules application methods on an execution owner; native asynchronous I/O is not required.

[[reactor|Reactor]] dispatches readiness handlers. An Active Object can receive delegated work from such a handler, provided admission and result handoff remain bounded and explicit.

## Sources

- [R. Greg Lavender and Douglas C. Schmidt: Active Object](https://www.dre.vanderbilt.edu/~schmidt/PDF/Act-Obj.pdf) — original pattern, aliases, participants, guards, and result delivery.
- [Schmidt and coauthors: POSA Volume 2](https://www.dre.vanderbilt.edu/~schmidt/POSA/POSA2/) — concurrent and networked pattern catalog context.
- [Python: queue](https://docs.python.org/3.11/library/queue.html) — FIFO exchange, capacity, and nonblocking admission.
- [Python: concurrent.futures](https://docs.python.org/3.11/library/concurrent.futures.html) — future state, cancellation, exceptions, and deadlock conditions.
- [Python: threading](https://docs.python.org/3.11/library/threading.html) — locks, non-daemon lifecycle, and joining.
- [Akka: Actor model](https://doc.akka.io/libraries/akka-core/current/typed/guide/actors-intro.html) — message-based independent execution and state isolation, distinct from assuming all actor semantics for this proxy.

The stock-owner example, queue policy, shutdown protocol, and diagrams are original teaching material.
