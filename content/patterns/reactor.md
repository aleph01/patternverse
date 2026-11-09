---
id: reactor
type: pattern
title: Reactor
summary: Wait for readiness across registered event sources, then dispatch short handlers that perform nonblocking work and return control to the loop.
status: published
aliases:
  - Dispatcher
  - Notifier
tags:
  - software-engineering
  - concurrency
  - readiness
  - event-loop
verses:
  - software-engineering
attribution: Reactor pattern by Douglas C. Schmidt; original Proactor paper; official Python, libuv, and Project Reactor documentation. Original Patternverse byte-record collector and native illustrations.
---

## Purpose and problem

A telemetry collector receives records from many connected devices. One device sends half a record and goes quiet. If the collector waits inside that device's read routine until the record is complete, every other device waits too. Giving every connection a dedicated thread can work, but adds scheduling and synchronization costs as connection counts grow.

The collector needs to wait efficiently across connections while keeping each connection's progress separate. Detecting that a socket can be read, assembling a complete record, and deciding what the record means are different responsibilities.

## Core idea

**Wait centrally; handle readiness briefly; return.** Register sockets and the events their handlers need. A selector waits until one or more sockets are ready, then the dispatcher invokes their registered handlers. Each handler attempts a small amount of nonblocking I/O, keeps any unfinished record state, and returns to the loop. The selector fills the formal **synchronous event demultiplexer** role. Other supported resource types depend on the platform.

Schmidt's original paper also calls it **Dispatcher** or **Notifier**. Those words have broader uses; here they name this readiness-oriented collaboration. Project Reactor is a JVM reactive-streams library, not another name for this pattern. Proactor instead dispatches completion of previously initiated asynchronous operations; a Reactor handler generally performs the I/O after readiness notification.

![Two sockets are registered with the Reactor. The dispatcher waits on the selector, receives readable socket handles, and invokes each handle's registered handler. Each handler attempts nonblocking reads, retains unfinished state, and returns control to the dispatcher.](../assets/software-engineering/reactor-dispatch.svg "Readiness identifies which operation to attempt; it does not supply a complete application record. The selector waits, the dispatcher chooses the registered callback, and the handler performs I/O.")

## How it works

### Keep waiting separate from handling

The **handle** identifies a resource such as a socket. The **demultiplexer**, such as a selector, reports ready handles and event types. The **dispatcher** owns registration and the event loop. A **handler** owns the protocol state needed across callbacks. These roles can be functions and tables rather than an inheritance hierarchy.

In Python, `DefaultSelector` chooses an available platform implementation. Its registration associates a file object, an interest mask, and application data; that data can hold a callback. The loop waits, retrieves the returned registrations, and dispatches their callbacks. Supported resource types vary by platform, so a socket-oriented example should not imply every file or device is selectable.

Readiness is permission to attempt an operation, not a complete-message guarantee. Keep sockets nonblocking and handle `BlockingIOError` by returning. Reads can produce fragments, multiple records, or EOF. Preserve framing state per connection. Writes can also be partial: retain unsent bytes and request writable notifications only while output remains, rather than repeatedly waking on an idle writable socket.

### Bound work and own cleanup

This article uses one loop thread. Callbacks run sequentially and are not preempted by that loop. A slow database call or CPU-heavy handler therefore delays every other connection. Move such work to an appropriate executor or asynchronous facility, then return results through the loop's supported handoff mechanism. libuv illustrates why an event-loop framework can use different facilities for network I/O and blocking filesystem work.

Specify who removes registrations and closes handles. Unregister before closing; release selector resources on shutdown. A callback's I/O failure needs a connection-level policy, while an unexpected programming exception may need to terminate the loop visibly. Serial callbacks simplify loop-owned state, but do not make other threads or external systems safe automatically.

![A first sends hel without a newline, so its handler retains three bytes and returns. B sends ok followed by a newline and completes independently. A later sends lo followed by a newline, completing hello. A final incomplete record at EOF is rejected and its socket is unregistered before closing.](../assets/software-engineering/reactor-fragments.svg "This is an explanatory trace, not a promise about selector ordering. Each callback consumes at most four bytes in the example. Record state belongs to its connection; EOF never turns an unfinished record into a valid one.")

## Worked example

### Two streams, independent framing

Save `reactor.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Local stream socket pairs replace device connections, so no listening port is needed. Records are arbitrary bytes terminated by LF, with at most eight payload bytes; an empty record is valid. Successful registration transfers the reader's lifecycle to the loop. Each callback reads at most four bytes.

```python
import selectors


class Reactor:
    def __init__(self):
        self.selector = selectors.DefaultSelector()
        self.records = []
        self.errors = []

    def add(self, name, sock):
        pending = bytearray()

        def readable(key, mask):
            try:
                data = sock.recv(4)
            except BlockingIOError:
                return
            except OSError:
                self.errors.append((name, "I/O error"))
                self.remove(sock)
                return
            if not data:
                if pending:
                    self.errors.append((name, "truncated"))
                self.remove(sock)
                return
            for byte in data:
                if byte == 10:
                    self.records.append((name, bytes(pending)))
                    pending.clear()
                else:
                    pending.append(byte)
                if len(pending) > 8:
                    self.errors.append((name, "record too long"))
                    self.remove(sock)
                    return

        sock.setblocking(False)
        self.selector.register(sock, selectors.EVENT_READ, readable)

    def step(self, timeout=0.05):
        for key, mask in self.selector.select(timeout):
            key.data(key, mask)

    def remove(self, sock):
        self.selector.unregister(sock)
        sock.close()

    def close(self):
        for key in list(self.selector.get_map().values()):
            self.remove(key.fileobj)
        self.selector.close()
```

```python
import socket
from contextlib import ExitStack
from time import monotonic
from reactor import Reactor


with ExitStack() as resources:
    pairs = {}
    for name in ("A", "B"):
        reader, writer = socket.socketpair()
        pairs[name] = (resources.enter_context(reader),
                       resources.enter_context(writer))
    loop = Reactor()

    def until(condition):
        deadline = monotonic() + 2
        while not condition():
            if monotonic() >= deadline:
                raise TimeoutError("Demo did not progress")
            loop.step()

    try:
        for name, (reader, writer) in pairs.items():
            loop.add(name, reader)
        pairs["A"][1].sendall(b"hel")
        pairs["B"][1].sendall(b"ok\n")
        until(lambda: len(loop.records) == 1)
        print(*loop.records[0])
        pairs["A"][1].sendall(b"lo\n")
        until(lambda: len(loop.records) == 2)
        print(*loop.records[1])
        pairs["A"][1].sendall(b"x")
        for reader, writer in pairs.values():
            writer.shutdown(socket.SHUT_WR)
        until(lambda: not loop.selector.get_map())
        print(*loop.errors[0])
        print("registered:", len(loop.selector.get_map()))
    finally:
        loop.close()
```

Output is `B b'ok'`, `A b'hello'`, `A truncated`, and `registered: 0`. B completes while A lacks a terminator. A's later EOF rejects only its unfinished suffix; the previously completed `hello` remains delivered. `finally` closes the selector, and the outer context also closes the fixture endpoints if setup or execution fails.

The harness sends tiny blocking writes outside callbacks and uses a two-second progress timeout, not a production deadline. There is no listener, write dispatcher, TLS, worker pool, or durability. Result lists retain this demonstration's output, so they are not a bounded production sink.

## When to use it

Use Reactor for many mostly waiting connections when handlers can make short, nonblocking progress. A selector-based collector or command gateway can share waiting infrastructure while giving each connection its own parser and lifecycle.

A few connections with simple blocking workflows may be clearer with threads. Prefer an established event-loop library when it already handles transport, timers, cancellation, and buffering. CPU-bound parallel computation needs a separate execution strategy.

## Tradeoffs and common mistakes

One blocking handler stalls the loop. Nonblocking I/O does not make arbitrary library calls nonblocking, and multiple loop instances require ownership rules for cross-loop state.

Bound input sizes, queued output, accepted connections, and downstream work. The eight-byte limit here protects unfinished records only; it does not provide backpressure or authentication. Add idle deadlines so incomplete records cannot retain resources indefinitely.

Do not assume fair callback ordering or full sends. The one-read budget suits this selector example; raw edge-triggered integrations may require draining until an operation would block, or an explicit rearming strategy. Define shutdown and exception handling rather than silently swallowing every callback failure.

## Related patterns

[[observer|Observer]] notifies dependents of a subject's change. Reactor dispatches registered handlers for resource events and includes waiting and resource lifecycle responsibilities.

[[facade|Facade]] can hide platform-specific waiting machinery behind one interface; it does not specify the event loop itself.

[[strategy|Strategy]] makes a policy replaceable. A handler callback can supply replaceable processing, while Reactor supplies the readiness and dispatch collaboration around it.

## Sources

- [Douglas C. Schmidt: Reactor](https://www.dre.vanderbilt.edu/~schmidt/PDF/reactor-siemens.pdf) — original pattern, aliases, roles, registration, and dispatch.
- [Pyarali, Harrison, Schmidt, and Jordan: Proactor](https://www.dre.vanderbilt.edu/~schmidt/PDF/Proactor.pdf) — asynchronous-operation completion versus readiness handling.
- [Python: selectors](https://docs.python.org/3.11/library/selectors.html) — registration, readiness masks, platform support, and cleanup.
- [Python: Socket Programming HOWTO](https://docs.python.org/3.11/howto/sockets.html) — nonblocking operations, stream framing, partial transfers, and EOF.
- [libuv: Design overview](https://docs.libuv.org/en/v1.x/design.html) — loop ownership, callbacks, and work delegated to a thread pool.
- [Linux manual: epoll](https://man7.org/linux/man-pages/man7/epoll.7.html) — edge-triggered draining and rearming requirements.
- [Project Reactor: Introduction](https://projectreactor.io/docs/core/release/reference/gettingStarted.html) — the distinct JVM reactive-streams library.

The byte-record protocol, socket-pair example, and diagrams are original teaching material.
