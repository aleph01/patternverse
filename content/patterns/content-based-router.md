---
id: content-based-router
type: pattern
title: Content-Based Router
summary: Inspect a message's data and select the appropriate output channel, keeping destination-selection rules out of the producer and downstream handlers.
status: published
aliases:
  - Content Based Router
  - Content-Based Routing
  - CBR
tags:
  - software-engineering
  - messaging
  - integration
verses:
  - software-engineering
attribution: "Content-Based Router: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns. Supporting Apache Camel and RabbitMQ documentation. Original Patternverse order-routing policy, Python example, and native illustrations."
---

## Purpose and problem

A shop accepts physical goods, digital downloads, and unfamiliar product types introduced by partners. Physical orders may need standard or express handling. Orders worth at least $1,000 must go through review before fulfillment, even when the buyer selected express shipping.

If checkout knows every handler and exception, each routing change becomes a producer change. Broadcasting everything makes consumers repeat the rules and risks two handlers acting on the same order. The system needs one place to decide where this particular message belongs.

## Core idea

**Content-Based Router** inspects message data and selects the appropriate output channel. The producer sends to an input channel; the router owns destination selection, and the receiving handler owns the work at that destination.

Think **inspect, select, forward**. Hohpe and Woolf's [original catalog entry](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ContentBasedRouter.html) establishes the pattern. Content Based Router and Content-Based Routing are alternate spellings; Apache Camel exposes it through its Choice construct. It is a kind of Message Router, rather than an alias for every routing mechanism.

This article uses a single selected destination and ordered, first-match rules. That is an explicit policy. A [Recipient List](https://www.enterpriseintegrationpatterns.com/patterns/messaging/RecipientList.html) computes several recipients and sends to all of them; a [Message Filter](https://www.enterpriseintegrationpatterns.com/patterns/messaging/Filter.html) passes or discards messages through one output. Those are different delivery intentions.

![A valid physical express order for 100000 US dollar cents enters an ordered routing policy. The high-value rule matches before the express rule, selecting manual-review only. A physical express order for 99999 cents reaches priority-fulfillment instead. The selected channel is a decision, not proof that a consumer completed the work.](../assets/software-engineering/content-based-router-precedence.svg "First match is a policy: a high-value express order selects review, not both review and priority fulfillment. The boundary is 100000 US dollar cents.")

## How it works

### Decide what the router may inspect

Content can include an agreed payload field or message header. A transport's routing key is only useful when its meaning accurately represents the selection rule. Routers should depend on a small, stable message contract rather than arbitrary producer internals.

Validate the fields needed for routing. A missing amount is not a zero amount; an unrecognized product kind is not automatically a physical product. Decide whether malformed messages are rejected, retained for investigation, or sent to an explicit invalid-message channel.

The router selects a logical destination from an allowed set. Do not let an untrusted payload supply an arbitrary endpoint URL or bypass authorization by claiming a privileged classification. Downstream handlers still enforce their own invariants and permissions.

### Make overlap and fallback deliberate

Rules can overlap. An expensive express order satisfies two predicates, so first-match priority matters. [Apache Camel's Choice documentation](https://camel.apache.org/components/4.22.x/eips/choice-eip.html) explicitly describes the first matching `when` and an `otherwise` branch. Other routing systems can have different semantics; do not infer one-result behavior from a list of predicates alone.

Prefer mutually exclusive conditions where practical. Where precedence expresses a real business rule, name it and keep it visible. Define what happens when no rule matches. A valid new product category may need review, while a malformed record needs a different investigation path.

### Separate selection from reliable forwarding

A selected channel is not a completed delivery. A real router must handle an unavailable destination, bounded buffering, retries, and the point at which it acknowledges its input. A crash after forwarding but before acknowledging can cause repeated forwarding; acknowledging before a safe handoff can lose work.

RabbitMQ's [acknowledgment and publisher-confirm guide](https://www.rabbitmq.com/docs/confirms) distinguishes consumer acknowledgments from publisher confirms. Neither alone establishes that the eventual business handler finished. Preserve message identity through retries, and make repeated effects safe where necessary.

A router also does not establish global ordering across its outputs. If related messages take different paths, consumers may observe different progress. Own routing-policy changes explicitly: deploy a coherent rule snapshot, record the rule/version used, and decide whether replay uses the original policy or a newer one.

## Worked example

### Review before express handling

Previously checkout chose handlers itself. Now it emits a common order message, and one policy selects a logical channel. Save these files together and run `python3 demo.py` with Python 3.10+; no packages are required.

The input is an already decoded dictionary with exactly five fields. `usd_cents` is a nonnegative integer in **US dollar cents**: 100000 means $1,000. `express` must be a Boolean, and `schema` must be integer 1. Kind comparison is exact and case-sensitive. The policy leaves the input untouched.

**routing.py — select one logical output**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Decision:
    channel: str
    rule: str
    policy: str = "orders-v1"


def route(message):
    fields = {"schema", "order_id", "kind", "express", "usd_cents"}
    if type(message) is not dict or set(message) != fields:
        return Decision("invalid-messages", "shape")
    valid = (
        type(message["schema"]) is int and message["schema"] == 1
        and all(type(message[k]) is str and message[k].strip()
                for k in ("order_id", "kind"))
        and type(message["express"]) is bool
        and type(message["usd_cents"]) is int
        and message["usd_cents"] >= 0
    )
    if not valid:
        return Decision("invalid-messages", "fields")
    if message["usd_cents"] >= 100000:
        return Decision("manual-review", "high-value")
    if message["kind"] == "digital":
        return Decision("digital-delivery", "digital")
    if message["kind"] == "physical" and message["express"]:
        return Decision("priority-fulfillment", "express-physical")
    if message["kind"] == "physical":
        return Decision("standard-fulfillment", "physical")
    return Decision("unclassified-review", "otherwise")
```

**demo.py — overlap, exact boundary, and fallback**

```python
from routing import route


cases = [
    ("A41", "physical", True, 99999),
    ("A42", "physical", True, 100000),
    ("A43", "digital", False, 1200),
    ("A44", "physical", False, 4500),
    ("A45", "service", False, 9900),
    ("A46", "physical", False, -1),
]
for order_id, kind, express, cents in cases:
    message = dict(schema=1, order_id=order_id, kind=kind,
                   express=express, usd_cents=cents)
    choice = route(message)
    print(order_id, choice.channel, choice.rule, choice.policy)
# A41 priority-fulfillment express-physical orders-v1
# A42 manual-review high-value orders-v1
# A43 digital-delivery digital orders-v1
# A44 standard-fulfillment physical orders-v1
# A45 unclassified-review otherwise orders-v1
# A46 invalid-messages fields orders-v1
```

A42 is both expensive and express, but review wins before any fulfillment branch. A45 has valid fields and no ordinary product route, so the fallback retains its need for classification. A46 has an invalid amount and never reaches a business route. The high-value rule also takes precedence for expensive digital or unfamiliar kinds; that is this shop's policy.

The returned value records a selection only. It does not enqueue, acknowledge, reserve stock, charge a customer, or perform review. A transport adapter would forward the unchanged message to the chosen allowed channel. The example has no network, queue, retries, concurrency, or live rule updates. Production input-size and parser limits must be enforced before this already-decoded model is called.

![An unfamiliar but structurally valid service order selects unclassified-review through the otherwise rule. A negative amount selects invalid-messages before business rules run. Selecting priority-fulfillment says nothing about enqueue acknowledgment or completed shipment; those are later boundaries with their own failure handling.](../assets/software-engineering/content-based-router-boundaries.svg "Separate valid-but-unmatched messages from malformed input, and route selection from delivery and business completion. None of these paths silently drops a message in the model.")

### Routing from headers

Camel Choice can select a route using message headers instead of inspecting a document body. This is useful when a producer supplies a stable classification header under a shared contract. The classification must remain trustworthy and consistent with the payload; a header does not automatically make a business claim authoritative. The Python example implements neither Camel nor its transport behavior.

## When to use it

Use it when messages entering one logical channel need different processing paths, producers should not know concrete handlers, and content-based rules change independently of production.

A fixed point-to-point channel is simpler when every message goes to the same destination. A local conditional is sufficient when selection belongs entirely inside one component. Introduce a separate router when it creates a useful integration boundary, not just to rename an `if` statement.

## Tradeoffs and common mistakes

A router reduces producer coupling but becomes a concentrated owner of message knowledge. Keep rules narrow; embedding pricing, workflow state, or remote lookups can turn it into a fragile central service. External lookups introduce availability and consistency assumptions absent from a pure content decision.

Adding an early broad rule can shadow later rules. Test overlaps, threshold boundaries, unsupported versions, unknown values, and fallback behavior. Record match counts and unexpected routes without logging sensitive payloads indiscriminately.

Routing replayed messages under changed rules can send one logical operation to different handlers. Versioned decisions help investigation, but require an explicit replay contract; a version label alone does not pin execution or prevent duplicates.

## Related patterns

[[pipes-and-filters|Pipes and Filters]] organizes processing stages. A router can introduce a branch between stages while filters own transformations.

[[data-publish-subscribe-distribution|Publish-Subscribe]] gives independent interests their own deliveries. This router chooses one path; it does not give every interested handler a copy.

[[data-idempotent-writes|Idempotent Writes]] addresses repeated effects after retries. Selecting a destination deterministically does not make forwarding or processing exactly once.

## Sources

The linked Enterprise Integration Patterns entries establish Content-Based Router and distinguish Recipient List and Message Filter. Camel documents ordered choice and header-based selection. RabbitMQ supports the separate acknowledgment and confirmation responsibilities.

The order policy, thresholds, code, and illustrations are original teaching examples.
