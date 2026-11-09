---
id: software-domain-modeling-business-logic
type: collection
title: Domain Modeling and Business Logic
summary: Express business concepts, rules, and valid changes through deliberate models and responsibilities.
status: published
verses:
  - software-engineering
items:
  - domain-model
  - entity
  - value-object
  - aggregate
  - domain-service
  - domain-event
  - specification
  - data-bounded-contexts
  - service-layer
  - transaction-script
---

These patterns examine how software represents business meaning and organizes the rules that govern valid changes.

[[domain-model|Domain Model]] combines behavior with the state it governs, so callers request meaningful operations rather than editing records freely.

[[entity|Entity]] preserves the identity of a continuing domain concept across changes to its attributes and representations.

[[value-object|Value Object]] represents a coherent domain value with attribute-based equality, validation, and immutable replacement.

[[aggregate|Aggregate]] places a consistency boundary around a root and its owned state, so changes preserve the rules of the complete unit.

[[domain-service|Domain Service]] names a focused business operation that has no natural entity or value-object owner, while keeping state and invariants with their owners.

[[domain-event|Domain Event]] records a meaningful occurrence as a fact, separating the state owner from reactions and making commitment and delivery choices explicit.

[[specification|Specification]] gives a matching criterion its own reusable object, so selection and validation can share the rule and combine it with other requirements.

[[data-bounded-contexts|Bounded Context]] defines where a coherent model and its language apply, while making translations and responsibilities between models explicit.

[[service-layer|Service Layer]] defines shared application operations that coordinate domain behavior, persistence, and transaction outcomes across different callers.

[[transaction-script|Transaction Script]] organizes business rules around procedures that handle complete application requests, sharing helpers where useful.

Compare this organization of business logic with the wider structural choices in [[software-application-architecture|Application Architecture]].
