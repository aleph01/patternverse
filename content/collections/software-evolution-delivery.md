---
id: software-evolution-delivery
type: collection
title: Evolution and Delivery
summary: Change running systems through deliberate compatibility, transition, and release boundaries.
status: published
verses:
  - software-engineering
items:
  - data-incremental-replacement
  - data-expand-migrate-contract
  - branch-by-abstraction
  - feature-toggle
  - blue-green-deployment
  - ml-canary-rollout-with-rollback
  - deployment-pipeline
  - ml-shadow-deployment
---

These patterns examine how software can evolve while existing users and dependent systems continue to operate.

[[data-incremental-replacement|Strangler Fig]] replaces legacy responsibilities through controlled seams and useful slices, with explicit ownership during coexistence and a path to retirement.

[[data-expand-migrate-contract|Expand–Migrate–Contract]], also called Parallel Change, supports old and new interfaces while data and usages migrate, then removes the old form after readiness is established.

[[branch-by-abstraction|Branch by Abstraction]] replaces an implementation behind a shared application boundary, keeping intermediate stages releasable while callers migrate and the old supplier is retired.

[[feature-toggle|Feature Toggle]], also called Feature Flag, separates deployed code from exposure through an explicit configurable decision, with defined targeting, failure behavior, ownership, and retirement.

[[blue-green-deployment|Blue-Green Deployment]] prepares a production-capable candidate beside the serving environment, then switches new traffic while explicitly managing in-flight work, data compatibility, and the return window.

[[ml-canary-rollout-with-rollback|Canary Release]] limits initial real-user exposure and expands, holds, or restores traffic under explicit release-specific evidence rules; model-serving examples remain part of the article.

[[deployment-pipeline|Deployment Pipeline]] promotes identifiable candidates through staged checks, deployment, and operational verification with explicit evidence and release decisions.

[[ml-shadow-deployment|Shadow Traffic]] — Copy selected live requests to an isolated candidate, keep the incumbent responsible for user responses, and evaluate candidate behavior without granting it serving authority.
