---
id: correlation-identifier
type: pattern
title: Correlation Identifier
summary: Carry an explicit identifier across related messages so a receiver can recover the correct conversation context regardless of arrival order or individual message identity.
status: published
aliases:
  - Correlation ID
  - Conversation Identifier
  - Conversation ID
tags:
  - software-engineering
  - messaging
  - integration
verses:
  - software-engineering
attribution: "Correlation Identifier: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns; conversation scope clarified by Gregor Hohpe. Supporting RabbitMQ, W3C, and Stripe documentation. Original Patternverse shipping-quote example, code, and native illustrations."
---

## Purpose and problem

A shipping screen requests economy and express quotes for order O42. Both answers arrive in one inbox. Express returns first, and a relay has assigned a new message ID while forwarding that request. Matching by arrival order gives the wrong price; matching by order ID cannot distinguish the two questions.

The receiver needs to recover the particular conversation's context after control has passed through queues, services, and time. The next message received is not necessarily the answer to the last request sent.

## Core idea

**Correlation Identifier** carries an explicit association between related messages. A receiver uses that value to look up the context needed to interpret an answer or advance a conversation.

The original [Hohpe and Woolf catalog entry](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html) describes a reply's correlation field referring to the originating request ID. In [Correlation and Conversations](https://www.enterpriseintegrationpatterns.com/ramblings/09_correlation.html), Hohpe broadens the scope: an originator can choose a separate conversation ID that participants preserve across multiple messages. Conversation Identifier is therefore an established alternate name, with a wider scope than one request-reply pair.

Think **message ID identifies this envelope; correlation identifies the exchange it belongs to**. Neither the customer's identity nor the order number necessarily identifies one exchange.

![Economy and express quote requests for the same order O42 carry different correlation IDs, desk:C1 and desk:C2. A relay changes the express envelope message ID from desk:M2 to relay:M9 while preserving desk:C2. Replies have their own message IDs; the matcher uses correlation IDs to recover the economy or express context.](../assets/software-engineering/correlation-identifier-matching.svg "Preserve the conversation value across envelope changes. Two operations on the same order need distinct matching contexts.")

## How it works

### Define the association before sending

The originator allocates an ID and records the expected context before publication. Participants carry the agreed value through transformations and replies. A receiver validates the message, looks up the correlation value, and applies its completion policy to that context.

Field names vary. Some protocols copy the request's message ID into the reply's correlation field. Others propagate an application-generated correlation value on both messages. Document that choice; blindly copying a transport-assigned ID after an intermediary creates a new envelope can break matching.

The [Return Address pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ReturnAddress.html) addresses a different question: where should the reply go? An inbox may contain many conversations, so destination and correlation do separate jobs.

### Own the namespace and pending state

IDs must be unique within the matching scope for as long as old messages can arrive. A process-local counter restarted at zero is insufficient if its old inbox or replies survive. Use a suitable unique-ID scheme or a fresh namespace, and specify whether a retry continues one conversation or creates a new attempt under it.

The receiver owns pending state, capacity, completion, expiration, and disposal. A shared consumer needs synchronization or a transactional transition around lookup and completion. Persistent workflows need recoverable context as well as persisted messages.

[RabbitMQ's RPC tutorial](https://www.rabbitmq.com/tutorials/tutorial-six-python) shows correlation with a shared callback queue and explains duplicate replies after server redelivery. Ignoring a reply after local completion does not prevent the service from executing twice. A conversation expecting several answers also needs an explicit aggregation rule; removing its context after the first answer would be premature.

Correlation is not authentication. Associate contexts with the expected tenant or authorized responder, validate payloads before consuming pending state, and avoid sensitive information in exposed identifiers.

![The matcher receives a reply for desk:C2. An untrusted or unexpected source does not consume its context. A valid reply from the expected carrier completes the express quote and removes desk:C2. A duplicate then has no pending match. Explicit cleanup removes abandoned desk:C3 so its later reply is also ignored.](../assets/software-engineering/correlation-identifier-lifecycle.svg "Lookup and completion are separate decisions. This example checks the expected source before removing a pending context, and accepts one valid answer per context.")

## Worked example

### Two prices for one order

Previously the screen paired answers by order number or queue position. Now each quote has its own conversation value. Save these files together and run `python3 demo.py` with Python 3.10+; no packages are required. Prices are integer **US dollar cents**, not floating-point dollars.

**matching.py — retain the original operation context**

```python
from dataclasses import dataclass


def token(value):
    if type(value) is not str or not value.strip() or len(value) > 128:
        raise ValueError("Nonblank token of at most 128 characters required")
    return value


@dataclass(frozen=True)
class Request:
    message_id: str
    correlation_id: str
    order_id: str
    mode: str


@dataclass(frozen=True)
class Reply:
    message_id: str
    correlation_id: str
    usd_cents: int

    def __post_init__(self):
        token(self.message_id)
        token(self.correlation_id)
        if type(self.usd_cents) is not int or self.usd_cents < 0:
            raise ValueError("Nonnegative integer cents required")


class Matcher:
    def __init__(self, session):
        self.session = token(session)
        self.sequence = 0
        self.pending = {}

    def begin(self, order_id, mode, provider):
        for value in (order_id, mode, provider):
            token(value)
        if len(self.pending) >= 2:
            raise OverflowError("Two conversations already pending")
        self.sequence += 1
        correlation = token(f"{self.session}:C{self.sequence}")
        self.pending[correlation] = (provider, order_id, mode)
        return Request(f"{self.session}:M{self.sequence}",
                       correlation, order_id, mode)

    def accept(self, reply, authenticated_source):
        if type(reply) is not Reply:
            raise TypeError("Validated Reply required")
        token(authenticated_source)
        context = self.pending.get(reply.correlation_id)
        if context is None or context[0] != authenticated_source:
            return None
        del self.pending[reply.correlation_id]
        _, order_id, mode = context
        return order_id, mode, reply.usd_cents

    def forget(self, correlation):
        return self.pending.pop(token(correlation), None) is not None
```

**demo.py — new envelopes, stable associations**

```python
from dataclasses import replace
from matching import Matcher, Reply


matcher = Matcher("desk")  # Fresh namespace for this simulated lifetime.
economy = matcher.begin("O42", "economy", "carrier")
express = matcher.begin("O42", "express", "carrier")
forwarded = replace(express, message_id="relay:M9")
print("forwarded:", forwarded.message_id, forwarded.correlation_id)
# Replier gives its own envelope an ID and echoes the conversation value.
answer = Reply("carrier:R91", forwarded.correlation_id, 1200)
print("wrong source:", matcher.accept(answer, "other"))
print("express:", matcher.accept(answer, "carrier"))
print("duplicate:", matcher.accept(answer, "carrier"))
answer = Reply("carrier:R90", economy.correlation_id, 500)
print("economy:", matcher.accept(answer, "carrier"))
abandoned = matcher.begin("O42", "express", "carrier")
print("cleanup:", matcher.forget(abandoned.correlation_id))
print("late:", matcher.accept(
    Reply("carrier:R92", abandoned.correlation_id, 1300), "carrier"))
# forwarded: relay:M9 desk:C2
# wrong source: None
# express: ('O42', 'express', 1200)
# duplicate: None
# economy: ('O42', 'economy', 500)
# cleanup: True
# late: None
```

The relay can replace an envelope without changing its association. The matcher returns the saved order and shipping mode, not a guess based on reply order. Unknown, unexpected-source, duplicate, and abandoned replies leave other conversations intact.

This is a sequential matching simulation, not a shipping service. The caller supplies the source as if a trusted transport adapter had authenticated it; a sender-controlled string provides no such protection. Reply construction validates the modeled payload only. A fresh session namespace is an assumption, not a production ID generator. Explicit `forget` represents owner cleanup after timeout or disposal; no timer, network, inbox routing, persistence, automatic retry, or thread synchronization is implemented. Removing context does not cancel remote work.

### A trace can contain several conversations

[W3C Trace Context](https://www.w3.org/TR/trace-context/) identifies a distributed trace and its parent context for tracing. A checkout trace may include both quote conversations plus payment and stock checks. Reusing only that trace ID as the match key would merge distinct pending operations. A tracing identifier can help diagnostics without being the application's reply-matching key.

## When to use it

Use it when several operations share a reply path, messages arrive out of order, intermediaries replace envelopes, or a workflow must recover context across several exchanges.

A direct local call already has return context. A dedicated reply channel per operation may supply sufficient association without another application field. Add explicit correlation where the transport's association is insufficient or must survive its boundaries.

## Tradeoffs and common mistakes

One business entity can participate in many conversations. Reusing an order ID, customer ID, or entire trace ID as the sole pending key can overwrite legitimate work. Conversely, regenerating the conversation value at every hop destroys the association.

Correlation does not establish ordering, delivery, success, or exactly-once effects. [Stripe's idempotent-request documentation](https://docs.stripe.com/api/idempotent_requests) describes a separate contract for safely retrying operations. Merely attaching a correlation value does not implement that contract.

Pending contexts cost memory or storage. Bound them, clean them up, and monitor unmatched replies. Reusing a value too early can make a stale reply complete new work. Logging full payloads alongside IDs can expose information unrelated to matching.

## Related patterns

[[request-reply|Request-Reply]] defines the question-and-answer conversation. Correlation Identifier recovers the appropriate context when its messages return.

[[data-idempotent-writes|Idempotent Writes]] prevents repeated delivery from applying the same logical write again. Matching a reply once protects a local continuation, not the remote business effect.

[[data-publish-subscribe-distribution|Publish-Subscribe]] distributes a message to independent interests. Several responses under one correlation value require a deliberate completion or aggregation policy.

## Sources

The linked catalog establishes reply correlation and return addressing; Hohpe's essay explains independent conversation identity across intermediaries. RabbitMQ supplies a concrete reply implementation. W3C and Stripe support the distinctions from tracing and idempotency.

The shipping scenario, bounded matcher, relay simulation, and illustrations are original teaching material.
