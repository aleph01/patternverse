---
id: software-persistence-transactions
type: collection
title: Persistence and Transactions
summary: Separate domain-facing data access from storage details and make persistence and consistency responsibilities explicit.
status: published
verses:
  - software-engineering
items:
  - repository
  - data-mapper
  - active-record
  - unit-of-work
  - identity-map
  - lazy-load
  - optimistic-offline-lock
  - pessimistic-offline-lock
  - database-per-service
  - cqrs
  - data-event-sourcing
  - data-transactional-outbox
---

These patterns examine how applications retrieve and store domain state, and where responsibility for durable and consistent changes belongs.

[[repository|Repository]] supplies a domain-oriented collection interface while keeping queries and mapping behind a deliberate access contract. It distinguishes that contract from transaction ownership and storage guarantees.

[[data-mapper|Data Mapper]] translates between domain objects and database representations while keeping persistence knowledge outside the model.

[[active-record|Active Record]] combines a record's state, local domain behavior, and database operations in one object, with explicit persistence lifecycle choices.

[[unit-of-work|Unit of Work]] tracks pending object changes and coordinates their persistence and completion within one business operation.

[[identity-map|Identity Map]] reuses one live object per persistent identity within an explicitly owned scope, separating local identity from database freshness.

[[lazy-load|Lazy Load]] defers omitted object data until it is needed, with explicit loading, failure, and resource-lifetime policies.

[[optimistic-offline-lock|Optimistic Offline Lock]] checks the version originally read and commits its conditional update, version advance, and edit-log row together, rejecting stale proposals.

[[pessimistic-offline-lock|Pessimistic Offline Lock]] reserves write ownership across requests and validates the current acquisition token when saving or releasing the reservation.

[[database-per-service|Database per Service]] keeps persistent data behind its owning service contract, enforcing private access independently of shared or separate physical hosting and exposing cross-service coordination costs.

[[cqrs|CQRS]] separates the behavioral model for business changes from query-specific representations, with shared or separate storage and an explicit consistency policy.

[[data-event-sourcing|Event Sourcing]] records accepted business changes as authoritative history, reconstructing state through ordered replay and protecting conditional appends against stale decisions.

[[data-transactional-outbox|Transactional Outbox]] commits a business change and its outgoing message together, then relays committed intent with explicit retry and duplicate-delivery boundaries.
