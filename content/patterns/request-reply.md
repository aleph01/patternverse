---
id: request-reply
type: pattern
title: Request-Reply
summary: Pair a request message with a correlated reply so a caller can obtain an outcome without assuming that sending and receiving happen in one call stack.
status: published
aliases:
  - Request-Response
  - Request/Reply
tags:
  - software-engineering
  - messaging
  - integration
verses:
  - software-engineering
attribution: "Request-Reply, Return Address, and Correlation Identifier: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns. Supporting RabbitMQ, NATS, and AWS documentation. Original Patternverse inventory example, bounded simulation, and native illustrations."
---

## Purpose and problem

A checkout desk asks an inventory service how many books and shoes are available. The requests travel through messaging infrastructure. The shoes answer arrives first, a duplicate follows, and the books answer arrives later. Matching replies by arrival order would show the wrong stock beside each product.

The desk needs an answer associated with its question, but neither network latency nor service availability is under its control. It also cannot keep every unanswered question in memory forever.

## Core idea

**Request-Reply** forms a conversation from two messages: a request and its reply. The requestor retains enough context to continue when the answer arrives; the replier performs the operation and sends back its outcome.

Think **ask, identify, answer, resume**. Hohpe and Woolf's [Request-Reply catalog entry](https://www.enterpriseintegrationpatterns.com/patterns/messaging/RequestReply.html) describes both blocking waits and asynchronous callbacks. Request-Response is a common alternate name. Here the focus is messaging; HTTP request/response and RPC frameworks can hide parts of this conversation behind their APIs.

Sending a request does not itself deliver the business answer. An acknowledgment of receipt and an operation's result are different contracts.

![The desk sends inventory requests desk:1 and desk:2 with the return address desk.replies. The inventory service sends replies to that inbox, copying each request ID into its reply correlation ID. Reply desk:2 arrives before desk:1; the desk selects the matching pending context by ID rather than arrival order.](../assets/software-engineering/request-reply-correlation.svg "The return address selects the destination; the correlation ID selects the waiting request within it. Reply order need not match request order.")

## How it works

### Address the reply and identify the conversation

A request channel carries work to a replier. A reply channel carries an answer back. They may share infrastructure while remaining logically distinct paths.

[Return Address](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ReturnAddress.html) places the reply destination in request metadata, avoiding a hard-coded destination in the service. A shared inbox saves creating a channel for every question. [Correlation Identifier](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html) then associates each incoming answer with its outstanding request. The example uses explicit envelope fields; other protocols encode the association differently.

The requestor owns its pending contexts, identifiers, deadlines, and inbox lifetime. Establish the reply receiver and pending context before sending, so a fast answer cannot arrive before its waiter exists. Keep IDs unique across the period in which old replies can arrive, including process restarts. Correlation identifies a conversation; it does not authenticate a sender. Real deployments must authorize request handling and reply destinations, validate payloads, and prevent one tenant's reply entering another tenant's context.

### Define completion and uncertainty

Specify whether an answer reports acceptance, completed work, or a business rejection. The inventory example reports an observed stock count, not a reservation or promise that a later purchase succeeds.

[RabbitMQ's RPC tutorial](https://www.rabbitmq.com/tutorials/tutorial-six-python) demonstrates callback queues and correlation, including duplicate replies after server redelivery. Accepting a reply once at the client does not prevent repeated execution at the server.

A deadline bounds local waiting. [AWS's timeout guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) explains why timeout does not establish that side effects never happened. Retrying a stock query may be acceptable; retrying a debit requires a deliberate business idempotency contract. A correlation ID and an idempotency key serve different purposes, even if an implementation connects them.

![A pending request has a local deadline of 500 milliseconds. A valid reply received at 499 milliseconds completes that request. If the request is still pending at 500 milliseconds, expiration removes its context. A later reply is ignored. The remote service can still have completed the work; local expiration is not remote cancellation.](../assets/software-engineering/request-reply-deadline.svg "This example accepts replies only before the local deadline. Expiration releases pending state; it neither cancels remote work nor proves failure.")

## Worked example

### Inventory answers arriving out of order

Previously the desk paired each reply with the next waiting product. Now each request carries an ID and return address. Save these two files together and run `python3 demo.py` with Python 3.10+; no packages are required.

Time is supplied as nondecreasing, nonnegative integer **milliseconds on one simulated local clock**. Stock is measured in **units**; `None` means unknown SKU. The requestor allows two outstanding requests. Its session name must be fresh for the inbox lifetime, including delayed replies from earlier clients.

**conversation.py — owned pending contexts and a deadline**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Request:
    request_id: str
    reply_to: str
    sku: str


@dataclass(frozen=True)
class Reply:
    correlation_id: str
    units: int | None


class Requestor:
    def __init__(self, session, inbox):
        if not all(type(s) is str and s.strip() for s in (session, inbox)):
            raise ValueError("Session and inbox required")
        self.session, self.inbox = session, inbox
        self.pending = {}
        self.sequence = 0
        self.now = 0

    def tick(self, now_ms):
        if type(now_ms) is not int or now_ms < self.now:
            raise ValueError("Nondecreasing integer milliseconds required")
        self.now = now_ms

    def begin(self, sku, now_ms, timeout_ms=500):
        if type(sku) is not str or not sku.strip():
            raise ValueError("SKU required")
        if type(timeout_ms) is not int or timeout_ms <= 0:
            raise ValueError("Positive timeout required")
        self.tick(now_ms)
        if len(self.pending) >= 2:
            raise OverflowError("Too many outstanding requests")
        self.sequence += 1
        request_id = f"{self.session}:{self.sequence}"
        self.pending[request_id] = (sku, now_ms + timeout_ms)
        return Request(request_id, self.inbox, sku)

    def accept(self, reply, now_ms):
        self.tick(now_ms)
        context = self.pending.pop(reply.correlation_id, None)
        if context is None:
            return None, "ignored", None
        sku, deadline = context
        if now_ms >= deadline:
            return sku, "timed out", None
        status = "unknown SKU" if reply.units is None else "ok"
        return sku, status, reply.units

    def expire(self, now_ms):
        self.tick(now_ms)
        expired = tuple(k for k, (_, end) in self.pending.items() if now_ms >= end)
        for request_id in expired:
            del self.pending[request_id]
        return expired


def stock_reply(request):
    inventory = {"book": 3, "shoe": 8}
    return request.reply_to, Reply(request.request_id, inventory.get(request.sku))
```

**demo.py — explicit request and reply paths**

```python
from collections import deque
from conversation import Requestor, stock_reply


desk = Requestor("desk", "desk.replies")
requests = [desk.begin("book", 0), desk.begin("shoe", 0)]
inboxes = {desk.inbox: deque()}
# Simulate the service answering the second request first.
for request in reversed(requests):
    address, reply = stock_reply(request)
    inboxes[address].append(reply)
shoe_reply = inboxes[desk.inbox].popleft()
print("answer:", desk.accept(shoe_reply, 100))
print("duplicate:", desk.accept(shoe_reply, 150))
print("answer:", desk.accept(inboxes[desk.inbox].popleft(), 200))
late = desk.begin("book", 250, timeout_ms=250)
print("expired:", desk.expire(500))
_, late_reply = stock_reply(late)
print("late:", desk.accept(late_reply, 501))
print("pending:", len(desk.pending))
# answer: ('shoe', 'ok', 8)
# duplicate: (None, 'ignored', None)
# answer: ('book', 'ok', 3)
# expired: ('desk:3',)
# late: (None, 'ignored', None)
# pending: 0
```

The dictionary routes replies to the supplied inbox; IDs select pending entries and their product context. The returned tuple names that product, its status, and its stock units. Expiration is explicit: a real owner must schedule cleanup and report timeout to its waiting application. Acceptance at the exact deadline is also treated as timeout, even if cleanup has not run.

This is a sequential simulation with trusted envelopes. It has no broker, network, payload validator, persistence, retries, or thread synchronization. Pending entries retain a product and deadline; a real implementation also needs a continuation or durable business context. Transport queues are not bounded by the two-entry pending limit. Restart recovery requires more than recreating this object.

### Request-reply over pub/sub

[NATS documents request-reply](https://docs.nats.io/learn/core-nats/request-reply) using reply inboxes over publish-subscribe. Its standard request API accepts the first response and discards additional answers. Gathering several providers' quotes requires an explicit collection policy instead. One-to-one conversation semantics do not require a dedicated physical connection.

## When to use it

Use it when a caller needs a particular operation's outcome and messaging is already an appropriate boundary. It supports outstanding conversations without requiring the sender's thread to block.

A local function is simpler within one process. A direct service API may be simpler for a short remote query. Long-running work often suits an accepted job ID and later status lookup or completion event, rather than keeping a reply waiter alive.

## Tradeoffs and common mistakes

Request-Reply preserves a dependency on another service's answer. Deep synchronous chains multiply waiting and failure exposure even when queues connect the services.

Bound pending work, monitor timeouts and unmatched replies, and specify inbox cleanup on disconnect or shutdown. Do not reuse an identifier while an old answer could match a new request. Treat missing replies as uncertain outcomes, and distinguish business rejection from transport failure. Changing an inbox from temporary to durable changes its recovery responsibilities, not automatically the durability of pending application context.

## Related patterns

[[data-publish-subscribe-distribution|Publish-Subscribe]] distributes messages to independent interests. It can carry a request and reply, but does not itself define which answer completes a conversation.

[[command|Command]] encapsulates an operation. A request can carry a command, while Request-Reply supplies the conversation around its outcome.

[[domain-event|Domain Event]] announces a meaningful past fact. A request asks for work or information and anticipates a reply; an event need not have a waiting caller.

## Sources

Hohpe and Woolf's linked catalog entries establish the conversation, return address, and correlation roles. RabbitMQ and NATS document concrete implementations. AWS supports the timeout and retry qualifications.

The checkout scenario, Python simulation, deadline rule, and illustrations are original teaching examples.
