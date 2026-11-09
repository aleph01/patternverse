---
id: software-application-architecture
type: collection
title: Application Architecture
summary: Organize application responsibilities, boundaries, and dependencies around deliberate architectural choices.
status: published
verses:
  - software-engineering
items:
  - layers
  - ports-and-adapters
  - microkernel
  - pipes-and-filters
  - blackboard
  - modular-monolith
  - microservices
  - dependency-injection
  - functional-core-imperative-shell
---

These patterns examine how an application's major responsibilities fit together and which dependencies its components may have. Begin with [[layers|Layers]], which groups responsibilities into ordered abstractions with an explicit access policy.

[[ports-and-adapters|Ports and Adapters]], also called Hexagonal Architecture, separates application-owned conversations from the technologies that drive or serve them.

[[microkernel|Microkernel]] keeps a stable operational core while optional plug-ins contribute specialized capabilities through explicit contracts.

[[pipes-and-filters|Pipes and Filters]] composes independent processing stages by passing each stage's output to the next through explicit stream contracts.

[[blackboard|Blackboard]] lets independent knowledge sources build partial solutions in a shared workspace while a controller selects useful contributions from its current state.

[[modular-monolith|Modular Monolith]] keeps one application deployment while cohesive modules own their interfaces, internal code, and data.

[[microservices|Microservices]] makes business capability boundaries independently deployable, with explicit communication contracts and service-owned data.

[[dependency-injection|Dependency Injection]] separates assembling collaborators from using their contracts, keeping implementation choices and resource ownership explicit.

[[functional-core-imperative-shell|Functional Core, Imperative Shell]] keeps decisions pure and value-based while surrounding application code gathers inputs and performs effects.

Compare the architectural arrangement with the object collaborations in [[gof-design-patterns|GoF Design Patterns]].
