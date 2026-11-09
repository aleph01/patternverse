---
id: resource-pool
type: pattern
title: Resource Pool
summary: Manage reusable resources behind a borrowing boundary, returning each to circulation only after exclusive use and required cleanup.
status: published
aliases:
  - Pooling
tags:
  - software-engineering
  - concurrency
  - resources
  - lifecycle
verses:
  - software-engineering
attribution: Pooling by Michael Kircher and Prashant Jain; Apache Commons Pool, SQLAlchemy, Microsoft, and Python documentation. Original Patternverse buffer-pool example and native illustrations.
---

## Purpose and problem

A reporting service needs connections to a constrained database. Opening a connection for every report repeats authentication and initialization; letting every request keep its own connection can exhaust the server. Sharing one connection indiscriminately introduces overlapping commands and request state leaking between users.

The service needs reusable capacity with clear ownership. Someone must decide which resource a request may use, what to do when none is available, and whether a returned resource is safe for the next borrower.

## Core idea

**Borrow, use exclusively, clean, and return.** A Resource Pool retains reusable instances and grants temporary access to compatible borrowers. The pool owns their longer lifecycle; a borrower owns one period of use.

Kircher and Jain describe this arrangement as **Pooling**. Object Pool is the object-based form; connection and buffer pools are concrete applications. A cache usually retrieves a meaningful item by key, whereas an ordinary pool lends any suitable available instance. Physical reuse does not mean a new borrower should inherit the previous borrower's session state.

![A pool manages two resources. One belongs exclusively to caller A while another is idle and available to caller B. Caller C must wait if both are borrowed. Use takes place outside the pool's coordination lock, and a resource becomes available again only after return cleanup.](../assets/software-engineering/resource-pool-ownership.svg "The pool owns resource lifetime; borrowers own temporary use. A capacity limit counts resources in use and being reset as well as idle resources. Waiting policy and creation policy are separate choices.")

## How it works

### Availability is a lifecycle decision

A pool manages creation, checkout, return, reset, validation, and retirement. Some pools initialize eagerly, others create on demand, and some grow within configured limits. Exhaustion can mean waiting, timing out, rejecting, or allocating overflow. A library called a pool does not necessarily cap total allocation: Microsoft's ObjectPool, for example, limits retained objects rather than all objects it can allocate.

Coordinate availability changes atomically so two borrowers cannot receive the same exclusive resource. Keep actual use outside that coordination lock. Resource compatibility matters: credentials, endpoint, configuration, and thread affinity can require separate pools or keyed sub-pools. Thread-safe checkout does not make a borrowed object safe for concurrent sharing.

Before republishing a resource, restore its required baseline and check that it remains usable. Apache Commons Pool separates activation, validation, passivation, and destruction. Failed validation or reset must retire the resource; replacement, reduced capacity, or closing admission needs an explicit policy. Never return a known broken instance merely to preserve the count.

### A connection return is not a transaction policy

SQLAlchemy documents rollback on connection return to remove transactional state. Rollback alone may not remove temporary tables, prepared statements, or other session settings. Define the baseline for the actual backend, including tenant or authorization context. Pooling cannot decide whether business work should have committed, nor can returning a resource undo already committed effects.

Closing a pool also needs a contract. The example stops new borrows, wakes waiters, drops idle buffers, and lets active borrows finish. Close returns immediately; it does not prove every borrower has finished or revoke their current access.

## Worked example

### Visible reset with a small buffer pool

The reporting service can use a maintained connection-pool library. The following smaller model makes ownership visible with preallocated eight-byte buffers. Tiny byte arrays do not justify pooling for speed; this is a coordination example, not a performance recommendation or database-pool implementation.

Save `buffer_pool.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Size is a positive integer resource count. Writes accept immutable byte strings of 0–8 bytes and pad with zeros; reads return an eight-byte copy. Borrowers are trusted to use public methods and keep each borrow within one execution context.

```python
from collections import deque
from contextlib import contextmanager
from threading import Condition


class PoolClosed(Exception):
    pass


class Borrow:
    def __init__(self, buffer):
        self._buffer = buffer

    def _check(self):
        if self._buffer is None:
            raise RuntimeError("Borrow ended")
        return self._buffer

    def read(self):
        return bytes(self._check())

    def write(self, data):
        buffer = self._check()
        if type(data) is not bytes or len(data) > 8:
            raise ValueError("Supply 0..8 immutable bytes")
        buffer[:] = data.ljust(8, b"\0")


class BufferPool:
    def __init__(self, size=2):
        if type(size) is not int or size < 1:
            raise ValueError("Size must be a positive resource count")
        self._idle = deque(bytearray(8) for _ in range(size))
        self._changed = Condition()
        self._closed = False

    @contextmanager
    def borrow(self):
        with self._changed:
            while not self._idle and not self._closed:
                self._changed.wait()
            if self._closed:
                raise PoolClosed("Pool is closed")
            buffer = self._idle.popleft()
        handle = Borrow(buffer)
        try:
            yield handle
        finally:
            handle._buffer = None
            buffer[:] = bytes(8)
            with self._changed:
                if not self._closed:
                    self._idle.append(buffer)
                self._changed.notify_all()

    def close(self):
        with self._changed:
            self._closed = True
            self._idle.clear()
            self._changed.notify_all()
```

```python
from buffer_pool import BufferPool, PoolClosed

pool = BufferPool(size=1)
try:
    try:
        with pool.borrow() as old:
            old.write(b"secret")
            raise ValueError("job failed")
    except ValueError:
        print("job failed; returned")
    with pool.borrow() as current:
        print("reset:", current.read().hex())
        current.write(b"ok")
        try:
            old.read()
        except RuntimeError:
            print("old borrow: rejected")
        pool.close()
        print("active borrow:", current.read()[:2].decode("ascii"))
    try:
        with pool.borrow():
            pass
    except PoolClosed:
        print("new borrow: rejected")
finally:
    pool.close()
```

The five output lines are `job failed; returned`, `reset: 0000000000000000`, `old borrow: rejected`, `active borrow: ok`, and `new borrow: rejected`. The hexadecimal string represents eight zero bytes, not sixteen bytes.

The job exception propagates, but `finally` invalidates its handle and resets the backing buffer before making it idle. A later borrow gets a fresh handle, so the old handle cannot access the reused buffer through its public methods. Resetting happens outside the condition lock while that buffer remains unavailable. Closing during a borrow preserves its current access; on return, that buffer is reset and dropped instead of republished.

![A borrow owns a buffer until its scope ends, including on a job exception. Scope exit invalidates the old handle and resets all eight bytes before publishing the buffer as idle. If the pool has closed, the returned buffer is dropped instead. The next borrow receives a new handle; the old handle remains invalid.](../assets/software-engineering/resource-pool-return.svg "Ending a borrow and destroying a resource are different operations. Reset precedes reuse. Pool closure stops admission and changes the return path; it does not interrupt an active borrower.")

## When to use it

Use pooling for frequently reused resources whose creation is costly or whose available count is constrained, provided a reliable reset and ownership contract exists. Measure acquisition latency, utilization, hold times, waiting, and failed returns before choosing capacity.

Ordinary allocation is simpler when objects are cheap. A semaphore may be enough when the requirement is only to limit concurrent operations without retaining instances. Resource-specific libraries usually offer better validation and cleanup than a general homemade pool.

## Tradeoffs and common mistakes

Hold borrows briefly. Nested borrowing can deadlock when every holder waits for another instance from the same exhausted pool. Abandoned borrows can similarly prevent progress; timeouts and diagnostics help but do not make forcibly reclaiming a resource safe while its old borrower still uses it.

This model assumes allocation and fixed zero-fill cleanup complete. It has no failed-resource replacement, timeout, cancellation, fairness, external-handle disposal hooks, or wait-for-borrowers operation. Join client threads separately during shutdown. Do not share a handle concurrently or bypass its private state. Zeroing this byte array does not erase previously returned byte copies and is not a secure-memory-erasure guarantee.

Retaining idle resources consumes capacity and can preserve stale connections or sensitive state. Pooling also does not make an external operation atomic or exactly once. Creation, destruction, and reset failures need lifecycle handling, not silent recycling.

## Related patterns

[[thread-pool|Thread Pool]] manages reusable execution threads and schedules tasks onto them. Resource Pool commonly lends a resource to caller code, which remains responsible for using and returning it.

[[monitor-object|Monitor Object]] can coordinate pool availability and condition waiting. The resource itself remains exclusively borrowed while useful work occurs outside that monitor.

[[lease|Lease]] grants a right with an expiry and renewal policy. A scoped borrow here has no expiry: elapsed time alone does not invalidate or safely reclaim it.

## Sources

- [Michael Kircher and Prashant Jain: Pooling](http://www.kircher-schwanninger.de/michael/publications/Pooling.pdf) — original resource-management pattern, reuse, anonymity, and object-pool specialization.
- [Apache: GenericObjectPool](https://commons.apache.org/proper/commons-pool/apidocs/org/apache/commons/pool2/impl/GenericObjectPool.html) — borrowing, exhaustion, invalidation, and close/return behavior.
- [Apache: PooledObjectFactory](https://commons.apache.org/proper/commons-pool/apidocs/org/apache/commons/pool2/PooledObjectFactory.html) — creation, activation, validation, passivation, and destruction.
- [SQLAlchemy: Connection pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html) — reset on return, session-state limits, and invalidation.
- [Microsoft: ObjectPool](https://learn.microsoft.com/en-us/aspnet/core/performance/objectpool?view=aspnetcore-10.0) — pooling costs and retention limits versus allocation limits.
- [Python: Condition objects](https://docs.python.org/3.11/library/threading.html#condition-objects) — synchronized predicates, waiting, and notification.
- [Python: contextmanager](https://docs.python.org/3.11/library/contextlib.html#contextlib.contextmanager) — scoped release when a body raises an exception.

The buffer model, byte limits, handle guard, close policy, demonstration, and diagrams are original teaching material.
