---
id: thread-pool
type: pattern
title: Thread Pool
summary: Reuse a managed group of worker threads to execute submitted tasks, separating task lifetime from thread creation and shutdown.
status: published
aliases:
  - ThreadPool
tags:
  - software-engineering
  - concurrency
  - threads
  - resource-management
verses:
  - software-engineering
attribution: Thread-pool mechanisms documented by Oracle, Microsoft, Python, and Brian Quinlan's PEP 3148. Original Patternverse file-inspection example and native illustrations.
---

## Purpose and problem

An import tool checks thousands of small files before processing a batch. Reading them sequentially leaves other checks waiting behind each filesystem operation. Creating a thread for every file lets reads overlap, but a large batch can create thousands of stacks, open files, and scheduling competitors.

The tool needs concurrency without giving every task its own thread lifetime. It also needs to know which reads failed and when it is safe to remove temporary input files. A worker limit alone will not protect it from retaining an enormous pending backlog.

## Core idea

**Submit tasks to reusable workers instead of creating a thread per task.** A pool manages worker lifetimes, dispatches submitted work, and makes workers available for later tasks. A task can finish while its thread remains available for reuse.

ThreadPool is a common spelling. “Executor” describes a broader submission interface: an executor can use processes or other execution machinery. “Worker pool” is also broader than threads. Pool size may be fixed or adaptive; the example uses an explicit maximum of two threads, created as needed rather than assumed to exist immediately.

![A coordinator admits at most four jobs awaiting result collection. The pool has up to two reusable threads; in the illustrated snapshot two jobs execute while two wait. A thread finishes one job and takes another instead of being recreated. Completed futures still occupy the coordinator's admission window until collected.](../assets/software-engineering/thread-pool-workers.svg "Two worker threads limit simultaneous task execution. A separate four-job window limits submitted work awaiting collection, including queued, running, and completed-but-uncollected jobs. These are different resource limits.")

## How it works

### Manage workers and admission separately

A client submits a callable and its arguments. The pool assigns it to an available worker or retains it according to its scheduling and admission policy. Reuse avoids repeated thread startup and teardown. It does not remove per-task allocations, synchronization, or I/O costs.

Decide both how many workers can run and what happens when demand exceeds their capacity. Oracle's executor documentation distinguishes bounded queues, unbounded queues, and rejection policies. CPython 3.11's `ThreadPoolExecutor` uses an unbounded internal work queue; `max_workers=2` alone does not limit submissions. The example therefore places a rolling admission window in the coordinator, without changing executor internals.

Keep task inputs stable and shared state synchronized. Threads share memory; the pool does not serialize access to a mutable object or give every task a private database connection. A worker can execute unrelated tasks consecutively, so request-specific thread-local state also needs deliberate cleanup.

### Observe outcomes and own the lifecycle

A future represents one submitted task's eventual result or exception. Submission is not success. The coordinator collects each outcome and decides whether failure aborts the batch, becomes a report entry, or warrants a retry.

Waiting for futures and shutting down workers are distinct responsibilities. The component that owns the pool must stop submission and arrange cleanup. Tasks should release their own borrowed resources before returning. A timeout on result waiting does not stop running work; queued cancellation can succeed, while a running task needs its own cooperative stopping protocol.

## Worked example

### Inspect files through a rolling window

The import tool now uses one pool for the batch. Each task opens its own file, reads at most nine bytes, and closes the handle. Files longer than eight bytes are rejected; accepted results are byte counts. Filesystem errors become indexed error entries, allowing other reads to finish.

Save `file_pool.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. Inputs are a finite tuple of trusted `Path` objects. `window` is a positive integer count of submitted jobs awaiting collection; its default is four. The paths do not pin file versions: this example assumes its temporary files remain unchanged during inspection.

```python
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from pathlib import Path


def read_size(path):
    with path.open("rb") as stream:
        data = stream.read(9)
    if len(data) > 8:
        raise ValueError("file exceeds 8 bytes")
    return len(data)


def inspect_files(paths, window=4):
    if type(paths) is not tuple or any(not isinstance(p, Path) for p in paths):
        raise ValueError("Supply a finite tuple of Path objects")
    if type(window) is not int or window < 1:
        raise ValueError("Window must be a positive job count")
    source = iter(enumerate(paths))
    outcomes = []
    more = True
    with ThreadPoolExecutor(max_workers=2) as pool:
        pending = {}
        while pending or more:
            while len(pending) < window and more:
                item = next(source, None)
                if item is None:
                    more = False
                    break
                index, path = item
                pending[pool.submit(read_size, path)] = index
            if not pending:
                break
            done, _ = wait(pending, return_when=FIRST_COMPLETED)
            for future in done:
                index = pending.pop(future)
                try:
                    size = future.result()
                except (OSError, ValueError) as error:
                    outcomes.append((index, "error", type(error).__name__))
                else:
                    outcomes.append((index, "ok", size))
    return sorted(outcomes)
```

```python
from pathlib import Path
from tempfile import TemporaryDirectory
from file_pool import inspect_files

with TemporaryDirectory() as directory:
    root = Path(directory)
    for name, data in [("a", b"red"), ("b", b"blue"), ("large", b"123456789")]:
        (root / name).write_bytes(data)
    paths = tuple(root / name for name in ("a", "b", "large", "missing"))
    for index, status, value in inspect_files(paths):
        print(index, f"{value} bytes" if status == "ok" else f"error {value}")
```

Output is `0 3 bytes`, `1 4 bytes`, `2 error ValueError`, and `3 error FileNotFoundError`. Error entries are failed inspections, not byte measurements. Empty files return zero; an empty tuple returns an empty report.

The coordinator refills only after collecting completed futures. A finished task still counts against the window while its result awaits collection. Up to two tasks execute simultaneously; a window of one deliberately underuses that ceiling. The finite input and accumulated report remain additional memory, so this is not a constant-memory streaming API.

The executor context waits for submitted work and releases its workers before the function returns, including on an unexpected coordinator exception. The demo removes its temporary directory afterward. Expected read failures arrive through futures and do not prevent reuse of a worker. Index sorting restores report order, not execution order.

![In one possible schedule, worker A runs job 0 and later job 2 on the same thread. Worker B runs job 1 and later job 3. Each future becomes a result or exception, which the coordinator collects before freeing an admission place. After the final submitted tasks finish, the owner shuts down and joins the pool workers before removing temporary files.](../assets/software-engineering/thread-pool-lifecycle.svg "A future belongs to a task; a reusable thread outlives individual tasks. Result collection frees an admission place. Pool shutdown, rather than one task's completion, ends the owned worker lifetime. Assignments are illustrative.")

## When to use it

Use a pool when many independent, finite tasks can share execution capacity, especially when blocking I/O can overlap and per-task thread creation would be wasteful. Measure queue delay, active workers, task duration, rejection, and downstream load before choosing limits.

A direct loop is simpler for cheap sequential work. Long-lived dedicated activities may deserve dedicated threads. CPU-heavy Python code may need processes or native code that releases the GIL; thread count alone does not imply CPU parallelism on conventional CPython. Match worker limits to scarce downstream resources, not just the number of input jobs.

## Tradeoffs and common mistakes

A saturated pool can deadlock if every worker synchronously waits for child tasks queued to that same pool. Increasing the worker count can postpone this failure without removing the dependency cycle. Keep orchestration outside the saturated workers or use an execution model that accommodates those dependencies.

An unbounded backlog turns overload into memory growth and long waits. Creating a pool per small request loses reuse and can multiply resource limits across the application. Fair scheduling, completion order, and one task per particular thread are not guarantees to infer from the pattern.

The example has no deadlines, cancellation API, retries, durable jobs, or isolation from malicious tasks. A stuck read can make shutdown wait indefinitely. Pool shutdown does not roll back external effects, and a failed future does not prove that no side effect occurred.

## Related patterns

[[producer-consumer|Producer-Consumer]] describes work handoff through a buffer. Thread Pool adds managed, reusable thread capacity and its lifecycle; a producer-consumer system need not use threads or a pool.

[[active-object|Active Object]] associates queued method execution with an object's owner. A multi-worker pool does not by itself serialize one object's mutations.

[[reactor|Reactor]] dispatches readiness handlers. A pool can perform blocking work outside its loop, but completions must return through the loop's safe handoff mechanism, and admission still needs limits.

## Sources

- [Oracle: ThreadPoolExecutor](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html) — pooled execution, resource management, queue choices, and saturation policies.
- [Microsoft: The managed thread pool](https://learn.microsoft.com/en-us/dotnet/standard/threading/the-managed-thread-pool) — worker reuse, lifecycle, and workload suitability; runtime details differ.
- [Brian Quinlan: PEP 3148](https://peps.python.org/pep-3148/) — executor/future design, outcome observation, shutdown, and pool dependency deadlocks.
- [Python: concurrent.futures](https://docs.python.org/3.11/library/concurrent.futures.html) — Python 3.11 task, future, cancellation, waiting, and context-manager contracts.
- [CPython 3.11: thread executor implementation](https://github.com/python/cpython/blob/3.11/Lib/concurrent/futures/thread.py) — unbounded internal queue and idle-thread reuse in that implementation.
- [Python: threading](https://docs.python.org/3.11/library/threading.html) — shared-memory execution and conventional CPython GIL limits.

The file inspector, admission window, byte limit, report policy, and diagrams are original teaching material.
