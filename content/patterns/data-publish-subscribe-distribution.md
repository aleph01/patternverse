---
id: data-publish-subscribe-distribution
type: pattern
title: Publish-Subscribe
summary: Publish a message to a topic so independently interested subscribers can receive it without the publisher naming or calling each recipient.
status: published
aliases:
  - Pub/Sub
  - PubSub
  - Publisher-Subscriber
  - Publish-Subscribe Channel
  - Publish–Subscribe Distribution
  - Publish-Subscribe Distribution
tags:
  - data-engineering
  - capture-synchronization
  - messaging
  - integration
verses:
  - data-engineering
  - software-engineering
attribution: "Publish-Subscribe Channel: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns; supporting Microsoft, Redis, Google Cloud, and AWS documentation. Original Patternverse order-distribution explanation, revised in place with a bounded Python simulation and native illustrations."
---

## Purpose and problem

An order is placed. Fulfillment needs a shipping task, analytics needs a sale record, and notifications needs a confirmation request. If the order service calls each consumer, adding another use changes the producer. An analytics outage can become an order-processing problem.

These applications need the same fact for independent purposes and may process it at different speeds. Two fulfillment workers, however, should divide fulfillment work rather than each creating another shipment.

## Core idea

**Publish-Subscribe** gives publishers a topic or channel and lets subscribers express their interests separately. A messaging mechanism routes each publication to the eligible subscriptions; publishers do not maintain calls to every downstream application.

Think **one publication, independent delivery paths**. Hohpe and Woolf's [Publish-Subscribe Channel](https://www.enterpriseintegrationpatterns.com/patterns/messaging/PublishSubscribeChannel.html) establishes the fan-out mechanism. Pub/Sub and Publisher-Subscriber are common names.

A **subscription** represents an independent interest. Worker instances sharing that subscription divide its work; they do not create additional independent copies. The [Competing Consumers pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CompetingConsumers.html) explains that second arrangement. Neither arrangement alone specifies persistence, retries, ordering, or exactly-once business effects.

![OrderPlaced messages E901 and E902 fan out to fulfillment, analytics, and notifications subscriptions. Each subscription receives both messages as independent logical deliveries. Two fulfillment workers take a different message each from their shared fulfillment queue; they divide that workload rather than each receiving the full stream. Publisher acceptance does not mean subscriber work has completed.](../assets/data-engineering/publish-subscribe-distribution.svg "Create separate subscriptions for independent interests; add workers within a subscription to share its work. Delivery progress belongs to each subscription.")

## How it works

### Separate publication from downstream completion

The publisher supplies a topic and a message contract. The intermediary maintains routing interests, and subscribers receive their own deliveries. Topics or filters determine eligibility; exact names, routing attributes, and schema changes are shared dependencies even when concrete consumers are unknown.

A publish acknowledgment can mean the broker accepted responsibility, not that fulfillment and analytics finished. If a workflow needs several outcomes before proceeding, it needs explicit coordination. Broadcasting an event does not establish their completion order.

### Choose delivery and recovery semantics

Durable subscriptions can preserve backlog while a consumer is offline, within retention and capacity limits. Ephemeral pub/sub can discard messages instead: official [Redis documentation](https://redis.io/docs/latest/develop/pubsub/) describes its Pub/Sub as at-most-once delivery with no replay of a lost delivery.

Google Cloud's [subscription overview](https://docs.cloud.google.com/pubsub/docs/subscription-overview) describes acknowledgment deadlines and default at-least-once delivery without ordering guarantees. A consumer can commit a change and crash before acknowledging, then receive the same message again. Stable event identities help, but duplicate handling must include the actual effect, not merely a separate preliminary lookup.

Ordering, retention, replay, and deduplication are product and configuration contracts. A new subscription may see only future publications; historical reconstruction needs retained messages or a baseline followed by subsequent changes.

### Own subscriptions, capacity, and access

Creation, pause, disconnection, and deletion need distinct lifetime rules. A deleted subscription may lose its backlog. Slow subscribers require a policy: buffering, rejection, dropping, or other recovery. Shared broker quotas can still couple otherwise independent consumers.

Microsoft's [Publisher-Subscriber guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber) covers subscription management, filters, failures, and per-topic access control. Authorize both publishing and subscription, minimize exposed payloads, and treat filtering as routing rather than an access check by itself.

![Notifications has two pending messages and a capacity of two. A third publication is rejected before any queue changes, even though fulfillment has space. After notifications is unsubscribed and its backlog discarded, a later publication targets only fulfillment and analytics. This is the simulation's chosen capacity policy, not a universal broker guarantee.](../assets/data-engineering/publish-subscribe-delivery.svg "The bounded simulation rejects queue-full fan-out before enqueueing. One slow subscription can therefore block the publisher; deleting it explicitly discards its pending work.")

## Worked example

### Three interests and two fulfillment workers

Previously, the order service called three destinations. Now it publishes OrderPlaced values to `orders`, while independently named subscriptions receive them. Save both files together and run `python3 demo.py` with Python 3.10+; no packages are required.

This sequential in-memory model uses exact topics, globally unique subscription names, and a capacity measured in **pending messages per subscription**. Envelopes contain immutable string identifiers; queues share that immutable value rather than serializing separate wire copies.

**broker.py — separate queues per subscription**

```python
from collections import deque
from dataclasses import dataclass


def name(value):
    if type(value) is not str or not value.strip():
        raise ValueError("Nonblank name required")
    return value


@dataclass(frozen=True)
class Message:
    event_id: str
    order_id: str

    def __post_init__(self):
        name(self.event_id)
        name(self.order_id)


class Broker:
    def __init__(self, capacity=2):
        if type(capacity) is not int or capacity <= 0:
            raise ValueError("Positive capacity required")
        self._capacity = capacity
        self._subscriptions = {}

    def subscribe(self, topic, subscription):
        name(topic)
        name(subscription)
        if subscription in self._subscriptions:
            raise ValueError("Subscription already exists")
        self._subscriptions[subscription] = (topic, deque())

    def publish(self, topic, message):
        name(topic)
        if type(message) is not Message:
            raise TypeError("Message required")
        queues = [queue for target, queue in self._subscriptions.values()
                  if target == topic]
        if any(len(queue) >= self._capacity for queue in queues):
            raise OverflowError("Subscription full")
        for queue in queues:
            queue.append(message)
        return len(queues)

    def take(self, subscription):
        queue = self._subscriptions[subscription][1]
        return queue.popleft() if queue else None

    def unsubscribe(self, subscription):
        self._subscriptions.pop(subscription, None)
```

**demo.py — fan-out, shared work, capacity, and cleanup**

```python
from broker import Broker, Message


broker = Broker(capacity=2)
for subscription in ["fulfillment", "analytics", "notifications"]:
    broker.subscribe("orders", subscription)
print("enqueued:", broker.publish("orders", Message("E901", "O42")),
      broker.publish("orders", Message("E902", "O43")))
print("worker-a:", broker.take("fulfillment").event_id)
print("worker-b:", broker.take("fulfillment").event_id)
print("analytics:", broker.take("analytics").event_id)
try:
    broker.publish("orders", Message("E903", "O44"))
except OverflowError:
    print("publish E903: blocked")
print("fulfillment pending:", broker.take("fulfillment"))
broker.unsubscribe("notifications")
print("after unsubscribe:", broker.publish("orders", Message("E903", "O44")))
print("analytics next:", broker.take("analytics").event_id)
print("fulfillment next:", broker.take("fulfillment").event_id)
# enqueued: 3 3
# worker-a: E901
# worker-b: E902
# analytics: E901
# publish E903: blocked
# fulfillment pending: None
# after unsubscribe: 2
# analytics next: E902
# fulfillment next: E903
```

The returned count measures enqueues, not successful processing. Capacity rejection leaves every queue unchanged in this sequential case; it is not crash-atomic fan-out. Here publishing with no matching subscriptions returns zero and retains nothing. Creating a subscription later provides no history.

`take` removes a message immediately. A worker failure afterward loses that delivery: there is no acknowledgment or retry protocol. Republishing the same event ID also creates another delivery; identifiers alone do not deduplicate. `unsubscribe` deletes the queue and its pending messages, unlike pausing a durable subscriber. The model is not thread-safe and has no network or persistence.

### Separate queues behind a managed topic

A documented implementation is [Amazon SNS delivering to subscribed SQS queues](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html). Independent applications can process their queues later. Broker and queue policies still determine durability, retry, permissions, and message handling; this simulation does not reproduce that service.

## When to use it

Use Publish-Subscribe when independent applications react to the same facts, consumers evolve separately, or each interest needs its own processing progress.

A direct call may be simpler for one receiver and an immediate result. A shared work queue suits interchangeable workers. A workflow with ordered steps and compensation needs more than fan-out.

## Tradeoffs and common mistakes

Putting unrelated applications on one shared subscription makes them compete for messages they both require. Conversely, giving every worker a new subscription can multiply business effects accidentally.

Fan-out multiplies bandwidth and downstream work. Monitor backlog, oldest pending messages, retries, and failures per subscription. Retention is finite; subscriber independence is not unlimited buffering or isolation from shared infrastructure failures.

Keep event meanings and schema evolution deliberate. Publishing separately from a source transaction can announce an uncommitted fact or omit a committed one. Retrying publication or handling can duplicate effects; plan recovery and idempotency explicitly.

## Related patterns

[[observer|Observer]] often directly connects a subject and callbacks in one process. Publish-Subscribe commonly introduces a channel and independent subscription ownership; synchronous versus asynchronous execution alone is not the complete distinction.

[[domain-event|Domain Event]] describes the meaningful fact being announced. Publish-Subscribe distributes messages and does not define their business meaning.

[[data-transactional-outbox|Transactional Outbox]] preserves publication intent alongside a committed source change. It does not make every consumer effect exactly once.

[[data-snapshot-then-stream|Snapshot Then Stream]] gives a new consumer a baseline before subsequent changes. Subscribing by itself does not reconstruct older history.

## Sources

The linked Enterprise Integration Patterns entries establish fan-out and competing work. Redis and Google document contrasting delivery contracts; Microsoft covers operational concerns; AWS provides the managed-topic-to-queue example.

The order-distribution scenario, Python simulation, capacity policy, and illustrations are original teaching material.
