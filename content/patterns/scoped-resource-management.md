---
id: scoped-resource-management
type: pattern
title: Scoped Resource Management
summary: Give each acquired resource a deterministic owner that releases it when its scope ends, including during failure and partial acquisition.
status: published
aliases:
  - RAII
  - Resource Acquisition Is Initialization
tags:
  - software-engineering
  - resource-management
  - ownership
  - scope
verses:
  - software-engineering
attribution: Resource ownership and RAII described by Bjarne Stroustrup and the C++ Core Guidelines; official Python documentation. Original Patternverse scoped archive-reader example and native illustrations.
---

## Purpose and problem

An import service creates a scratch directory, opens an archive inside it, and constructs a decoder around that file. The successful path closes everything. Then decoding fails, or opening the file fails after the directory already exists. Cleanup calls at the bottom of the function are skipped, leaving handles or temporary files behind.

Adding cleanup to each error branch duplicates responsibility. It also leaves an ordering question: the decoder uses the file, and the file lives inside the directory. Removing the directory first can fail on platforms that prohibit deleting open files. The service needs one owner for each acquisition and a dependable cleanup boundary.

## Core idea

**Pair acquisition with ownership immediately, then let scope exit perform release.** The scope carries cleanup responsibility across normal completion, early return, and exception propagation. Resources with dependencies are normally released in reverse acquisition order: finish the dependent before releasing what it uses.

In C++, **Resource Acquisition Is Initialization (RAII)** associates ownership with an object's lifetime and release with its destructor. That lifetime can be transferred or extended; it is not limited to the block where the resource was first acquired. Python's `with` statement provides an explicit scope-bound protocol for the same ownership goal. It does not rely on a Python destructor or promise identical C++ lifetime semantics.

![One scope owns a temporary directory, then an open file in that directory, then a gzip decoder that borrows that file. Acquisitions are registered as they succeed. On exit, the decoder closes before the file, and the file closes before the directory is removed. A returned byte value is independent of all three resources.](../assets/software-engineering/scoped-resource-management-ownership.svg "Register ownership as each acquisition succeeds. Unwind dependents before their dependencies. The scope owns cleanup responsibility; merely wrapping another object does not prove ownership of that object's underlying resource.")

## How it works

### Distinguish owning from borrowing

An owner must release a resource exactly according to its contract. A borrower may use it for an agreed lifetime but must not independently destroy it. A reference alone does not establish which role applies. Wrapper APIs sometimes close their underlying resource and sometimes leave it open; inspect that contract rather than inferring it from nesting.

Choose the smallest lifetime that includes every legitimate use. A returned immutable value can safely outlive its input stream. Returning the stream itself from a scope that immediately closes it gives the caller an unusable resource. If ownership must escape, transfer the owner explicitly instead of leaving cleanup scheduled in both places.

### Register each successful acquisition

A fixed resource set can use nested scopes. A changing set can use an ownership stack. Python's `ExitStack` registers exit callbacks as contexts are successfully entered, then unwinds them in reverse order. Earlier acquisitions are therefore covered when a later acquisition fails. Keeping the stack inside `with` makes that cleanup deterministic; collecting an abandoned `ExitStack` does not run its callbacks.

There is a boundary to this guarantee. Python calls `__exit__` after `__enter__` returns successfully. A resource that allocates internally and then fails during its own entry must clean up that partial allocation itself. An outer owner cannot release something it never successfully acquired or registered.

## Worked example

### Reading a small archive with three owned lifetimes

The import service uses one ownership stack for the scratch directory, raw file, and gzip decoder. `GzipFile` specifically leaves a supplied `fileobj` open when the decoder closes, so the raw file needs its own owner. The directory must remain present until both reader lifetimes end.

Save `small_archive.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Input is a trusted immutable gzip byte string of 1–64 bytes. Accepted decoded content is 0–8 bytes. The nine-byte read detects content exceeding that output limit. This is a small filesystem example, not a sandbox or a decompression resource-limit implementation.

```python
from contextlib import ExitStack
from gzip import GzipFile
from pathlib import Path
from tempfile import TemporaryDirectory


def read_small_gzip(payload):
    if type(payload) is not bytes or not 1 <= len(payload) <= 64:
        raise ValueError("Supply 1..64 immutable compressed bytes")
    with ExitStack() as scope:
        directory = Path(scope.enter_context(TemporaryDirectory()))
        archive = directory / "payload.gz"
        archive.write_bytes(payload)
        raw = scope.enter_context(archive.open("rb"))
        decoded = scope.enter_context(GzipFile(fileobj=raw, mode="rb"))
        result = decoded.read(9)
        if len(result) > 8:
            raise ValueError("Decoded content exceeds 8 bytes")
        return result
```

```python
from gzip import BadGzipFile, compress
from small_archive import read_small_gzip

print("decoded:", read_small_gzip(compress(b"red", mtime=0)))
try:
    read_small_gzip(b"not gzip")
except BadGzipFile:
    print("invalid archive: rejected")
try:
    read_small_gzip(compress(b"123456789", mtime=0))
except ValueError:
    print("oversize: rejected")
```

The three output lines are `decoded: b'red'`, `invalid archive: rejected`, and `oversize: rejected`. All limits are byte counts, not characters. An archive containing empty content returns `b''`; an empty compressed input is rejected before creating resources.

`Path.write_bytes` finishes its own short write before the readers open. The long-lived cleanup registrations are then directory, raw file, decoder. Returning `result` initiates cleanup before the caller receives it. A decoding error unwinds the same stack. If opening the raw file fails, only the already-entered directory context is unwound; no decoder has been created.

The return value is an independent byte string. No live file or decoder escapes. The function owns its temporary workspace and removes that workspace's contents, while the caller retains its original input bytes. Nothing here rolls back effects performed elsewhere by application code.

![On a successful read or body exception, cleanup closes the decoder, closes the raw file, and removes the directory. If opening the raw file fails, cleanup removes only the already-owned directory; no file or decoder exit is registered. A resource whose own entry fails remains responsible for its internal partial acquisition.](../assets/software-engineering/scoped-resource-management-failure.svg "Cleanup follows successful ownership registrations, not the list of resources the function hoped to acquire. Cleanup is attempted before an outcome leaves the scope; release failures can still change that outcome.")

## When to use it

Use this pattern for resources with paired acquisition and release: files, sockets, locks, pool borrows, transactions, or temporary workspaces. It is especially useful when several resources depend on one another or when setup can fail partway through.

Prefer established resource wrappers and language constructs to repeated hand-written cleanup branches. A simple nested `with` is sufficient for a fixed pair; `ExitStack` helps when the acquisition set is conditional or assembled incrementally. Ordinary immutable values without a release obligation do not need an artificial owner.

## Tradeoffs and common mistakes

Cleanup can itself fail. Python exit handlers can replace or suppress an exception, and `ExitStack` still attempts the remaining registered handlers as it unwinds. The example's standard contexts do not intentionally suppress body failures. Report cleanup failures and preserve useful exception context; do not equate “cleanup was invoked” with “every release succeeded.” C++ destructor exception rules differ, so language-specific release policy matters.

Scope boundaries do not stop background work. A thread, callback, or asynchronous operation retaining a borrowed handle may outlive its owner. Finish or join that work before release, or move ownership to a longer-lived component. Async resources may require `async with` and awaited cleanup rather than synchronous exit handlers.

This example has no deadlines, concurrency control, retries, crash recovery, or durable output. Buffered decoding may do more internal work than the returned nine-byte sample suggests. Abrupt process termination cannot be treated as structured scope exit. Resource cleanup also does not supply transaction rollback, atomic publication, or exactly-once external effects.

## Related patterns

[[scoped-locking|Scoped Locking]] applies the same lifetime pairing to a lock acquisition. Releasing a lock does not restore changed application state.

[[resource-pool|Resource Pool]] owns reusable instances for a longer lifetime. A scoped borrower can return an instance to that pool without destroying the underlying resource; those are separate ownership levels.

[[proactor|Proactor]] retains request context and borrowed buffers until asynchronous completion. Closing a surrounding scope too early cannot substitute for observing that completion boundary.

## Sources

- [Bjarne Stroustrup: Resource management and finally](https://www.stroustrup.com/bs_faq2.html#finally) — RAII, resource-owning handles, and deterministic release.
- [C++ Core Guidelines: R.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii) — automatic resource ownership through handles and RAII.
- [Python: The with statement](https://docs.python.org/3.11/reference/compound_stmts.html#the-with-statement) — successful entry, exit invocation, and exception handling.
- [Python: ExitStack](https://docs.python.org/3.11/library/contextlib.html#contextlib.ExitStack) — incremental registration, reverse unwinding, partial setup, and asynchronous alternatives.
- [Python: gzip](https://docs.python.org/3.11/library/gzip.html) — decoder lifetime and the supplied file object's separate close obligation.
- [Python: TemporaryDirectory](https://docs.python.org/3.11/library/tempfile.html#tempfile.TemporaryDirectory) — workspace ownership, context cleanup, and cleanup errors.

The archive scenario, size limits, ownership composition, demonstration, and diagrams are original teaching material.
