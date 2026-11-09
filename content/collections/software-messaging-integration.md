---
id: software-messaging-integration
type: collection
title: Messaging and Integration
summary: Connect independently evolving components through explicit message contracts, delivery paths, and processing responsibilities.
status: published
verses:
  - software-engineering
items:
  - data-publish-subscribe-distribution
  - request-reply
  - correlation-identifier
  - content-based-router
  - message-translator
  - anti-corruption-layer
  - splitter
  - aggregator
  - idempotent-receiver
  - data-dead-letter-queues
  - competing-consumers
---

These patterns examine how components exchange messages, route information, and coordinate responsibilities across integration boundaries.

[[data-publish-subscribe-distribution|Publish-Subscribe]] distributes a publication to independently interested subscriptions while keeping shared workers distinct from independent consumers. Delivery, retention, ordering, and failure semantics remain explicit choices.

[[request-reply|Request-Reply]] pairs a question with its correlated answer, making reply destinations, pending context, and local deadlines explicit.

[[correlation-identifier|Correlation Identifier]] preserves the association between related messages so receivers recover the right context across reply reordering and envelope changes.

[[content-based-router|Content-Based Router]] selects a logical destination from message data, with explicit precedence and separate handling for malformed and unmatched messages.

[[message-translator|Message Translator]] converts between declared message contracts, preserving justified meaning while exposing unsupported codes, units, and precision.

[[anti-corruption-layer|Anti-Corruption Layer]] protects a local model by expressing an external capability through local concepts and failures, rather than importing the external model into business code.

[[splitter|Splitter]] decomposes a composite message into separately identified work items, preserving parent context while making validation, ordering, and delivery boundaries explicit.

[[aggregator|Aggregator]] holds related results until a declared completion condition permits one combined outcome, with distinct-member accounting and explicit timeout and late-message policies.

[[idempotent-receiver|Idempotent Receiver]] protects a receiving endpoint from repeated effects by preserving logical message identity and coordinating duplicate recognition with the business transaction and acknowledgment.

[[data-dead-letter-queues|Dead Letter Channel]] retains messages that leave normal delivery or processing policy, preserving evidence and accountable recovery without hiding incomplete business outcomes.

[[competing-consumers|Competing Consumers]] lets interchangeable workers divide one logical work stream, keeping delivery ownership, acknowledgment, and redelivery separate from business effects.

Compare the message's business meaning with [[software-domain-modeling-business-logic|Domain Modeling and Business Logic]], and broader system boundaries with [[software-application-architecture|Application Architecture]].
