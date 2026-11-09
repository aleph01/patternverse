---
id: scoped-locking
type: pattern
title: Scoped Locking
summary: Bind an acquired lock's release to a scope so normal exits, early returns, and exceptions cannot omit the matching unlock.
status: published
aliases:
  - Synchronized Block
  - Guard
tags:
  - software-engineering
  - concurrency
  - synchronization
  - scope
verses:
  - software-engineering
attribution: Scoped Locking by Douglas C. Schmidt and the POSA authors; official Python and Microsoft C++ documentation. Original Patternverse inventory example and native illustrations.
---

## Purpose and problem

An inventory service checks available stock and records reservations. Several request threads can call it simultaneously. A developer adds explicit lock acquisition and release around the update, then adds an early rejection path for insufficient stock. That path returns without unlocking. Later requests stop progressing even though the rejected reservation changed nothing.

Adding an unlock to every return is fragile. Another branch or exception can bypass one, while a misplaced extra unlock can release too early. The service needs the protection interval to remain correct as control flow changes.

## Core idea

**Make leaving the protected scope responsible for releasing its lock.** Acquire through a guard or context manager, perform the critical section, and let structured cleanup release the acquisition. Normal completion, an early return, and a propagating exception share the same cleanup boundary.

Schmidt's Scoped Locking idiom also uses the names **Synchronized Block** and **Guard**. Here, guard means a scope-bound locking object, not a condition predicate or authorization check. The C++ form specializes resource acquisition is initialization, or RAII, for locks. RAII covers many resources and is not an exact synonym for locking.

![After lock acquisition succeeds, control enters the protected body. Normal completion, an early return, or an exception all reach the same scope-exit release. Only after that release does the caller continue, receive the return value, or observe the exception. Failed acquisition does not enter the protected body.](../assets/software-engineering/scoped-locking-scope.svg "Each successful acquisition has one scope-owned release. The illustration concerns structured control flow; it does not promise cleanup after process termination or restoration of changed data.")

## How it works

### Couple the acquisition to a cleanup boundary

The participating pieces are a lock, the shared state it protects, and a scope that owns the acquisition/release pair. The lock must remain valid throughout that scope. All competing accesses to the protected invariant must follow the same locking protocol; making one writer scoped does not protect an unlocked reader.

In Python, `with lock:` uses the lock's context-manager protocol. Once entry succeeds, leaving the block invokes exit cleanup even when the body returns or raises. This is deterministic scope cleanup, not a request for garbage collection to eventually release the lock. Do not manually release that same acquisition inside the block.

C++ commonly uses a named `std::lock_guard` or another appropriate guard. Its object lifetime defines the protection interval. An unnamed temporary can be destroyed at the end of its statement, leaving later statements unprotected. Language and API details matter: timed or try-lock guards must distinguish successful acquisition from an unprotected failure path. The Python example below uses blocking acquisition only.

### Keep the protected interval complete and short

Put the state-dependent check and its update inside one scope. A check outside the lock can become stale before mutation. Conversely, move unrelated formatting, network calls, callbacks, and thread joins outside the critical section when their correctness permits it. Work that waits for another caller while preventing that caller from obtaining the lock can deadlock.

Before exit, shared state must satisfy the invariant that the next caller relies on. Unlocking is not rollback. If a body changes state and then raises, cleanup releases the lock with those changes still present unless separate recovery logic restores them.

## Worked example

### Reserving stock without leaking an acquisition

The service replaces hand-written unlock branches with `with self._lock:`. It maintains a pair of integer item counts: available and reserved. The invariant is that both remain nonnegative and their sum equals the initial stock.

Save `inventory.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Initial stock is a nonnegative integer; each reservation requests a positive integer number of items. Boolean values are rejected. Each instance has its own plain, nonreentrant `Lock`. Callers use the public methods rather than altering private state.

```python
from threading import Lock


class Inventory:
    def __init__(self, stock):
        if type(stock) is not int or stock < 0:
            raise ValueError("Stock must be a nonnegative item count")
        self._state = (stock, 0)
        self._lock = Lock()

    def reserve(self, items):
        if type(items) is not int or items < 1:
            raise ValueError("Request a positive item count")
        with self._lock:
            available, reserved = self._state
            if items > available:
                raise ValueError("Insufficient stock")
            self._state = (available - items, reserved + items)
            return self._state

    def snapshot(self):
        with self._lock:
            return self._state
```

```python
from threading import Thread
from inventory import Inventory

inventory = Inventory(5)
print("reserve 2:", inventory.reserve(2))
try:
    inventory.reserve(4)
except ValueError as error:
    print("rejected:", error)
print("after rejection:", inventory.snapshot())

results = []
worker = Thread(target=lambda: results.append(inventory.reserve(3)), daemon=False)
worker.start()
worker.join()
print("next caller:", results[0])
```

Output is `reserve 2: (3, 2)`, `rejected: Insufficient stock`, `after rejection: (3, 2)`, and `next caller: (0, 5)`. Each tuple means `(available items, reserved items)`. The main thread reads the worker's result list only after joining that worker, outside any inventory lock scope.

The successful method returns from inside the block, yet release happens before the caller receives its tuple. The insufficient-stock exception also leaves through cleanup, allowing both the snapshot and the next caller to acquire the same lock. This rejection leaves state unchanged because its check precedes publication, not because scope exit undoes work.

The method computes a new immutable tuple before assigning it as the state. Both state-dependent decisions and publication are protected. Snapshots return an immutable value representing one observation, not a live view or a promise that the inventory remains unchanged afterward.

![With five initial items, reserving two changes the protected state to three available and two reserved, then returns after release. A request for four raises before changing that state and still releases. Another caller can then reserve the remaining three and obtain zero available and five reserved. All displayed states preserve a total of five items.](../assets/software-engineering/scoped-locking-inventory.svg "The rejection preserves stock by validating before mutation. Scoped cleanup makes the lock available on both success and rejection; it does not itself implement transaction rollback.")

## When to use it

Use Scoped Locking wherever a critical section has a clear lifetime, especially when branches, returns, or exceptions make manual unlock bookkeeping risky. A small synchronized object method or a consistent read of several related fields fits naturally.

Prefer a language or library's established scope-bound primitive to a custom guard. No lock is needed for data confined to one execution context. When an operation deliberately releases and reacquires around a wait, use the documented waiting protocol rather than assuming every scope wrapper holds uninterrupted ownership.

## Tradeoffs and common mistakes

Scope safety does not choose the right lock or solve lock ordering. The example's plain lock cannot be acquired recursively: calling `snapshot()` from inside `reserve()` while holding it would block. A reentrant lock changes that behavior but does not eliminate cycles involving several locks.

C++17 `std::scoped_lock` has a separate multi-mutex deadlock-avoidance algorithm. That is an API feature, not a guarantee of the general pattern or of Python's nested `with` statements. Multiple-lock designs still need a deliberate acquisition protocol and correct resource lifetimes.

Making a scope too large increases contention; making it too small can split one invariant across unprotected intervals. Avoid returning mutable protected internals. Do not hold a blocking thread lock across coroutine suspension and assume it acts as a task-aware async lock.

The example has no acquisition deadline, fairness guarantee, rollback, cross-process synchronization, or recovery from process failure. A stuck body retains its lock. Forced process termination does not promise structured cleanup or valid persistent state. Scoped Locking removes missed-release paths during supported execution; it does not make arbitrary work inside the scope safe.

## Related patterns

[[monitor-object|Monitor Object]] organizes synchronized methods and condition waiting around shared state. Scoped Locking handles individual protected lifetimes; a monitor wait can temporarily release and later reacquire its associated lock.

[[resource-pool|Resource Pool]] gives reusable resources a borrowing lifetime. A scoped lock can protect its availability bookkeeping without holding that lock throughout a borrower's work.

[[active-object|Active Object]] can confine mutable state to an execution owner. That may reduce shared-state locking, while its admission and shutdown bookkeeping can still use scoped critical sections.

## Sources

- [Douglas C. Schmidt: Scoped Locking](https://www.dre.vanderbilt.edu/~schmidt/PDF/ScopedLocking.pdf) — original idiom, historical aliases, scoped guard lifetime, and exception-safe release.
- [Schmidt and coauthors: POSA Volume 2](https://www.dre.vanderbilt.edu/~schmidt/POSA/POSA2/) — established catalog and synchronization-pattern context.
- [Python: Locks and the with statement](https://docs.python.org/3.11/library/threading.html#using-locks-conditions-and-semaphores-in-the-with-statement) — standard lock acquisition/release protocol and lock/reentrancy semantics.
- [Python: The with statement](https://docs.python.org/3.11/reference/compound_stmts.html#the-with-statement) — entry, exit, returns, and exception propagation.
- [Microsoft: scoped_lock](https://learn.microsoft.com/en-us/cpp/standard-library/scoped-lock-class?view=msvc-170) — C++ guard lifetime and the distinct multi-mutex acquisition feature.

The inventory scenario, immutable state publication, demonstration, and diagrams are original teaching material.
