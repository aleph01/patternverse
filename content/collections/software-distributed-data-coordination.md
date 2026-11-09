---
id: software-distributed-data-coordination
type: collection
title: Distributed Data and Coordination
summary: Coordinate business work and data across independent consistency boundaries with explicit progress and recovery rules.
status: published
verses:
  - software-engineering
items:
  - saga
  - api-composition
  - leader-election
  - lease
---

These patterns examine how independently owned data and locally committed operations contribute to a larger business outcome.

[[saga|Saga]] coordinates local transactions and explicit compensations, distinguishing business recovery from a shared rollback and exposing intermediate states and unresolved outcomes.

[[api-composition|API Composition]] answers selective cross-service queries through owner APIs, joining bounded responses by identity with explicit consistency, completeness, and failure rules.

[[leader-election|Leader Election]] selects a replaceable coordinator under an explicit authority protocol, distinguishing election safety, quorum availability, and destination-side rejection of obsolete owners.

[[lease|Lease]] bounds a scoped right by time, with explicit renewal, expiry, release, and reassignment rules, while separating client knowledge from authority and external effects.
