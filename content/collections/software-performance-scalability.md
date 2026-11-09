---
id: software-performance-scalability
type: collection
title: Performance and Scalability
summary: Reduce repeated work and manage growth with explicit capacity, cost, and freshness tradeoffs.
status: published
verses:
  - software-engineering
items:
  - cache-aside
  - memoization
  - data-materialized-views
  - data-horizontal-sharding
  - batching
  - request-coalescing
---

These patterns examine how software uses available resources as demand grows.

[[cache-aside|Cache-Aside]] makes application code own cache lookup, miss loading, and invalidation while retaining an authoritative source and explicit freshness limits.

[[memoization|Memoization]] reuses completed function results for equivalent inputs, making computation scope, immutable dependencies, and retention explicit.

[[data-materialized-views|Materialized View]] maintains a derived read surface, moving repeated query work into an explicit refresh and publication lifecycle.

[[data-horizontal-sharding|Sharding]] distributes rows across owning storage groups, making routing, locality, and safe data movement explicit.

[[batching|Batching]] shares fixed execution overhead across compatible operations, with bounded formation and explicit waiting, handoff, and per-member outcome semantics.

[[request-coalescing|Request Coalescing]] shares equivalent in-flight work among overlapping callers, with explicit identity, coordination scope, cancellation, and retirement rules.
