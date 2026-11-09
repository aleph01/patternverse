---
id: proactor
type: pattern
title: Proactor
summary: Initiate asynchronous operations with request context, then dispatch their completion results to handlers that decide the next step.
status: published
aliases: []
tags:
  - software-engineering
  - concurrency
  - completion
  - asynchronous-io
verses:
  - software-engineering
attribution: Proactor pattern by Irfan Pyarali, Tim Harrison, Douglas C. Schmidt, and Thomas D. Jordan; official Boost.Asio, Microsoft, and Python documentation. Original Patternverse completion-service simulation and native illustrations.
---

## Purpose and problem

A file-transfer service has several clients awaiting data. Waiting synchronously for each read wastes an execution context while the device works. A readiness loop avoids that wait, but its handlers still perform reads and preserve progress themselves. If the platform can perform a requested operation asynchronously, the application needs a different collaboration: submit the read now and handle its actual result later.

The difficulty moves into outstanding operations. Which request owns a buffer? Which connection receives a result? Can a canceled request still complete successfully? Closing a connection or recycling its memory too early can turn an ordinary delayed completion into a resource-lifetime bug.

## Core idea

**Initiate work; react to its completion.** A Proactor separates initiating an asynchronous operation, performing that operation, and dispatching its result. The completion handler receives status and transferred data or byte count; it does not receive merely a hint that I/O might now be attempted.

The established name is **Proactor**. “Completion dispatcher” names a participant, rather than another article. Reactor dispatches readiness before application I/O; Proactor dispatches results after an initiated operation finishes. A future, callback, or `async` keyword alone does not establish which mechanism performs the underlying I/O.

![The initiator submits a read request with an identity, buffer, and handler. The operation processor performs the read and places its result on a completion queue. The dispatcher retrieves that result and invokes the matching handler with transferred bytes and status.](../assets/software-engineering/proactor-completion.svg "Submission is not completion. The processor performs the operation; the handler consumes its result. A completed read can still provide only part of an application record.")

## How it works

### Carry context through the operation

An **initiator** supplies an operation, resource, buffer, and completion handler. The **asynchronous operation processor** performs it on the application's behalf. A **completion queue** retains results until the **dispatcher** invokes the appropriate handler. Request identity connects the result to its owner even when operations finish out of submission order.

The processor may use native asynchronous I/O or a library's emulation strategy. Boost.Asio presents this collaboration independently of its platform backend. Windows I/O completion ports provide queued completion packets for associated handles; application processing order must not be inferred from submission order. Python documents a Windows `ProactorEventLoop`, but portable Python coroutine code does not prove native Proactor execution on every platform.

Completion applies to the requested operation, not necessarily the whole business task. A read may return fewer bytes than requested; a write may transfer only a prefix. A handler checks status and count, updates its protocol state, and initiates another operation when necessary. Receiving three bytes is not proof that a complete record or transfer exists.

### Keep ownership until the outcome is known

Retain operation context and any buffers borrowed by the I/O API until its documented completion boundary. Windows overlapped I/O documentation explicitly warns against modifying or freeing those resources prematurely. Some APIs can complete immediately; follow their notification contract so immediate return and later notification do not process or release the same request twice.

Cancellation requests race with execution. `CancelIoEx` does not wait for completion, and the operation can ultimately succeed, report cancellation, or fail otherwise. A timeout likewise does not authorize freeing memory still in use. Stop admission during shutdown, request cancellation where supported, and observe outstanding outcomes before releasing their resources.

The dispatch policy is separate. One dispatcher thread serializes callbacks; multiple threads require synchronization for shared connection state. Keep handlers short and bound both outstanding work and undelivered completions. Async initiation does not provide free memory, CPU time, or backpressure.

![A and B occupy two request slots. B finishes first, but its queued completion still retains a slot. Cancellation is requested for A without freeing its context. The backend reports A successful with three bytes. Dispatch consumes B and A's actual outcomes and releases their request slots.](../assets/software-engineering/proactor-lifetime.svg "The model retains each request through completion dispatch. Cancellation is a request, not a terminal result; A's successful short read remains distinguishable from a canceled operation.")

## Worked example

### Two outstanding reads and a cancellation race

Save `proactor.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. This deterministic simulation has no OS I/O. `read` submits, `complete` is the test backend's terminal-result hook, and `dispatch_one` invokes a handler. At most two reads remain outstanding, each requesting 1–8 bytes. Labels identify request owners; IDs are local correlation values, not credentials.

```python
from collections import deque
from dataclasses import dataclass


@dataclass
class Request:
    label: str
    buffer: bytearray
    handler: object
    done: bool = False
    cancel_requested: bool = False


@dataclass(frozen=True)
class Completion:
    request_id: int
    label: str
    data: bytes
    error: str | None
    cancel_requested: bool


class Proactor:
    def __init__(self):
        self.pending = {}
        self.ready = deque()
        self.serial = 0

    def read(self, label, size, handler):
        if type(size) is not int or not 1 <= size <= 8:
            raise ValueError("Request 1..8 bytes")
        if not isinstance(label, str) or not label or not callable(handler):
            raise ValueError("Supply an owner label and callable handler")
        if len(self.pending) >= 2:
            raise RuntimeError("Outstanding-operation limit")
        self.serial += 1
        self.pending[self.serial] = Request(label, bytearray(size), handler)
        return self.serial

    def cancel(self, request_id):
        request = self.pending[request_id]
        if request.done:
            return False
        request.cancel_requested = True
        return True

    def complete(self, request_id, data=b"", error=None):
        request = self.pending[request_id]
        if request.done:
            raise ValueError("Duplicate terminal result")
        if type(data) is not bytes or len(data) > len(request.buffer):
            raise ValueError("Invalid completed byte count")
        if error not in (None, "cancelled", "read failed") or (error and data):
            raise ValueError("Invalid terminal status")
        request.buffer[:len(data)] = data
        request.done = True
        self.ready.append((request_id, len(data), error))

    def dispatch_one(self):
        if not self.ready:
            return False
        request_id, count, error = self.ready.popleft()
        request = self.pending.pop(request_id)
        result = Completion(request_id, request.label,
                            bytes(request.buffer[:count]), error,
                            request.cancel_requested)
        request.handler(result)
        return True
```

```python
from proactor import Proactor


def received(result):
    print(result.label, len(result.data), result.data,
          result.error, result.cancel_requested)


loop = Proactor()
a = loop.read("A", 8, received)
b = loop.read("B", 8, received)
loop.complete(b, b"ok")
loop.cancel(a)
print("retained requests:", len(loop.pending))
loop.complete(a, b"hel")
while loop.dispatch_one():
    pass
c = loop.read("C", 8, received)
loop.cancel(c)
loop.complete(c, error="cancelled")
loop.dispatch_one()
d = loop.read("D", 8, received)
loop.complete(d)
loop.dispatch_one()
print("remaining:", len(loop.pending))
```

The first line prints `retained requests: 2`; the last prints `remaining: 0`. Between them, the handler prints owner, byte count, bytes, error, and whether cancellation was requested. The completion results mean:

| Read result | Final outcome | Cancel requested? |
| --- | --- | --- |
| B: 2 bytes, `b'ok'` | Success | No |
| A: 3 bytes, `b'hel'` | Success | Yes |
| C: 0 bytes, `b''` | Canceled | Yes |
| D: 0 bytes, `b''` | Success: stream EOF | No |

A’s cancellation request did not prevent its successful short read. C’s final outcome is canceled. The error column prints `None` for the successful rows and `cancelled` for C.

A's `hel` still needs higher-level framing and another read if the connection remains active. Queued results retain admission slots until dispatch in this model. Dispatch copies completed bytes, removes pending state before calling the handler, and propagates handler exceptions; it does not retry a failed callback. Error completions carry no data here, an explicit model restriction.

There are no real buffers borrowed by a kernel, handles, threads, timers, durability, or Windows API calls. The backend chooses outcomes manually; the example demonstrates collaboration and lifetime accounting, not cancellation effectiveness or native performance.

## When to use it

Use Proactor when an I/O facility or library offers operation-level asynchronous completion and the application can retain request context until results arrive. File transfer and connection handling often benefit from the same initiation/completion separation, even with different backends.

For a few sequential operations, blocking code may be clearer. A readiness-oriented library may already solve the problem well. Prefer an established runtime over recreating native completion machinery, especially where buffer lifetime and shutdown behavior are consequential.

## Tradeoffs and common mistakes

A successful submission is not successful I/O. Neither completion ordering nor callback serialization is universal; specify them. Multiple overlapping operations on one connection need protocol ordering and distinct contexts, not a shared mutable buffer reused immediately.

Native I/O can still encounter synchronous behavior or submission errors. Treat those according to the API contract rather than assuming every failure produces a later callback. Do not equate operation completion with persistence, remote application acceptance, exactly-once business effects, or rollback of earlier side effects.

Bound admission, completion queues, and handler work; define cancellation and cleanup separately. The simulation's two-slot policy illustrates one bound, not a production overload policy.

## Related patterns

[[reactor|Reactor]] dispatches readiness so handlers can perform I/O; Proactor dispatches completed operations. A framework can implement a completion-facing API over readiness internally.

[[command|Command]] can represent a submitted request. It does not itself define asynchronous execution, result delivery, or resource lifetime.

[[observer|Observer]] maintains notification relationships. A Proactor completion is tied to a particular operation and context, rather than automatically broadcasting a subject's changes.

## Sources

- [Pyarali, Harrison, Schmidt, and Jordan: Proactor](https://www.dre.vanderbilt.edu/~schmidt/PDF/Proactor.pdf) — original pattern, participants, completion dispatch, and partial-transfer continuation.
- [Boost.Asio: Proactor design pattern](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/overview/core/async.html) — completion-facing collaboration and implementation alternatives.
- [Microsoft: I/O completion ports](https://learn.microsoft.com/en-us/windows/win32/fileio/i-o-completion-ports) — completion queues, handles, dispatch, and ordering qualifications.
- [Microsoft: Synchronous and asynchronous I/O](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o) — borrowed-resource lifetime, immediate outcomes, and completion notification.
- [Microsoft: CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex) — cancellation requests versus terminal results.
- [Python: asyncio platform support](https://docs.python.org/3.11/library/asyncio-platforms.html) — Windows Proactor event loop and platform distinctions.

The file-transfer scenario, bounded Python model, and diagrams are original teaching material.
