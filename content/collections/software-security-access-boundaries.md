---
id: software-security-access-boundaries
type: collection
title: Security and Access Boundaries
summary: Mediate access to protected resources through explicit identities, policy decisions, and enforceable trust boundaries.
status: published
verses:
  - software-engineering
items:
  - reference-monitor
  - gatekeeper
  - federated-identity
  - externalized-authorization
  - valet-key
  - audit-logging
---

These patterns examine where access decisions are enforced and which assumptions make that enforcement dependable.

[[reference-monitor|Reference Monitor]] requires every relevant protected operation to pass through a mechanism whose mediation cannot be bypassed or altered by its subjects and whose design supports convincing analysis.

[[gatekeeper|Gatekeeper]] separates public request screening from private business execution and storage authority through a limited-privilege ingress tier.

[[federated-identity|Federated Identity]] accepts authentication evidence from trusted identity providers while retaining local account association, session handling, and resource authorization.

[[externalized-authorization|Externalized Authorization]] separates policy evaluation from application enforcement while keeping protected operations guarded by explicit, usable decisions.

[[valet-key|Valet Key]] delegates narrowly scoped direct access to a resource service so the application can authorize transfers without relaying their bytes.

[[audit-logging|Audit Logging]] — Record attributable, structured evidence of significant operations and their outcomes, with explicit guarantees about capture, protection, and retention.
