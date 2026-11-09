---
id: software-concurrency-resource-management
type: collection
title: Concurrency and Resource Management
summary: Coordinate waiting, execution, and resource lifetimes with explicit ownership and bounded progress.
status: published
verses:
  - software-engineering
items:
  - reactor
  - proactor
  - active-object
  - monitor-object
  - producer-consumer
  - thread-pool
  - resource-pool
  - scoped-locking
  - scoped-resource-management
---

These patterns examine how concurrent work progresses and how execution contexts and resources are owned, shared, and released.

[[reactor|Reactor]] waits for readiness across registered event sources and dispatches short handlers, separating nonblocking I/O, per-connection state, and resource cleanup from the waiting mechanism.

[[proactor|Proactor]] initiates asynchronous operations and dispatches their completion results, with explicit request identity, buffer lifetime, partial results, cancellation races, and admission bounds.

[[active-object|Active Object]] turns method invocations into bounded queued requests for an execution owner, with explicit scheduling, deferred results, state isolation, cancellation, and shutdown.

[[monitor-object|Monitor Object]] keeps shared state, synchronized methods, and condition waiting behind one monitor lock, with caller-thread execution, predicate rechecking, and explicit closing behavior.

[[producer-consumer|Producer-Consumer]] separates work creation and execution through a synchronized buffer, with bounded admission, independent consumers, per-job outcomes, completion accounting, and coordinated shutdown.

[[thread-pool|Thread Pool]] reuses managed worker threads for independent tasks, separating worker ceilings from admission windows, task futures, owned resources, and pool shutdown.

[[resource-pool|Resource Pool]] lends reusable resources for exclusive use, separates scoped borrowing from resource lifetime, and makes return cleanup, exhaustion, and closing behavior explicit.

[[scoped-locking|Scoped Locking]] binds a successful lock acquisition to scope-owned release, preserving the pairing across normal exits, early returns, and exceptions while leaving invariant recovery and lock ordering explicit.

[[scoped-resource-management|Scoped Resource Management]] gives each successful acquisition an owner whose scope releases it, unwinding dependent resources before their dependencies across returns, failures, and partial setup.
