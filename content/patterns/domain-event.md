---
id: domain-event
type: pattern
title: Domain Event
summary: Represent a meaningful occurrence in the domain as an immutable fact, so its owner can record what happened without knowing every reaction.
status: published
aliases:
  - DDD Domain Event
  - Domain Event Pattern
verses:
  - software-engineering
tags:
  - domain-modeling
  - domain-facts
  - explicit-side-effects
attribution: "Domain Event as described by Eric Evans and Martin Fowler, with implementation context from Jimmy Bogard, Chris Richardson, and official documentation. Original Patternverse shipment example, code, and illustrations."
---

## Purpose and problem

A shipment moves from ready to dispatched. The archive needs its tracking code, customer communication needs a dispatch notice, and another team will later add a delivery forecast. Putting all three reactions inside `Shipment.dispatch` makes the shipment depend on every downstream concern.

Replacing those calls with a generic “shipment changed” notification loses important meaning. A delayed receiver might read a shipment that has already been delivered and miss the original tracking information. The model needs an explicit account of what happened at dispatch time.

## Core idea

A **Domain Event** is a representation of an occurrence that matters in the domain. Name it as a fact, such as `ShipmentDispatched`, and capture the information needed to understand that occurrence. A command requests something and may fail; an event describes an accepted occurrence.

The mental model is **record the fact; separate the reactions**. Evans's [DDD Reference, Domain Events](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) distinguishes business occurrences from technical activity. Fowler's [Domain Event](https://martinfowler.com/eaaDev/DomainEvent.html) discusses immutable source information and the difference between occurrence and observation time.

DDD Domain Event and Domain Event Pattern mean this pattern here. A UI callback, broker message, database row change, and command are different concepts. A domain event can travel in a message, but its meaning comes from the business occurrence rather than the transport.

![A dispatch request reaches Shipment, which checks its ready state and records a ShipmentDispatched fact with event ID, shipment ID, tracking code, and occurrence time. Separate reactions consume the fact; Shipment does not call the archive or customer-communication code directly.](../assets/software-engineering/domain-event-fact-reactions.svg "The command requests a transition; the event records its accepted local outcome. Arrows distinguish requesting, recording, and reacting. Persistence and delivery require an explicit policy.")

## How it works

### Capture meaning without retaining a live object

The owning entity or aggregate validates an operation and records the resulting fact. An externally observed business occurrence can also enter the model as an event after appropriate validation.

Use stable subject identifiers and value snapshots instead of a reference to a mutable aggregate. Include enough context for the intended reactions, without copying every field or exposing unnecessary personal data. Event identity identifies an occurrence; subject identity identifies the thing it concerns. The exact metadata is a contract choice, not a universal event schema.

For a delivery reported two hours late, occurrence time and observation time differ. Neither timestamp alone establishes a reliable global processing order. Where order matters, define the relevant stream, sequence, and concurrency policy.

### Record now; choose dispatch timing deliberately

Raising an event need not execute handlers immediately. [Jimmy Bogard's deferred approach](https://lostechies.com/jimmybogard/2014/05/13/a-better-domain-events-pattern/) separates recording events on an entity from dispatching them later. This keeps the domain operation testable without hidden global callbacks.

An event in a pending in-memory list does not prove a database transaction committed. Before-commit handlers can participate in the same transaction only when their writes actually enlist in it; irreversible network effects cannot be rolled back that way. After-commit handlers operate on committed facts but introduce a failure gap between commit and dispatch. [Microsoft's implementation guidance](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation) explains these timing choices.

### Separate domain facts from delivery contracts

An internal fact can produce a deliberately designed integration event for another bounded context. That external contract may use different fields, privacy rules, and schema versions. Publish it only for committed changes.

When publication must survive a process crash, [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html) stores the outgoing obligation alongside business state in one atomic commit. A relay can send it again after a crash. Consumers therefore need duplicate-safe effects and explicit ordering where required. Merely assigning an event ID supplies neither delivery nor deduplication.

![A domain operation first holds a pending event in memory. In a durable publishing design, one atomic transaction commits business state and an outgoing record. A relay later sends the committed message to consumers; a repeated delivery retains the same event identity. A rollback leaves no committed outgoing record.](../assets/software-engineering/domain-event-commit-delivery.svg "Pending, committed, and delivered are different stages. This outbox design illustrates durable publication; the Python example implements only local state and pending facts.")

## Worked example

### Dispatch once and preserve the fact

Before separation, `Shipment.dispatch` called concrete downstream systems. Here it validates the transition, constructs a fact, changes local state, and records the event. The application can later choose how to handle it.

Save these files together and run `python3 demo.py` with Python 3.10 or later. Identifiers and tracking codes are nonblank opaque text. The caller supplies an occurrence ID and a UTC timestamp whose `tzinfo` is `timezone.utc`; the model does not read a clock.

**model.py — an accepted transition records a pending fact**

```python
from dataclasses import dataclass
from datetime import datetime, timezone


def require_text(value):
    if type(value) is not str or not value.strip():
        raise ValueError("Nonblank text required")


@dataclass(frozen=True)
class ShipmentDispatched:
    event_id: str
    shipment_id: str
    tracking_code: str
    occurred_at: datetime

    def __post_init__(self):
        for value in (self.event_id, self.shipment_id, self.tracking_code):
            require_text(value)
        if type(self.occurred_at) is not datetime or self.occurred_at.tzinfo is not timezone.utc:
            raise ValueError("Use a UTC datetime with timezone.utc")


class Shipment:
    def __init__(self, shipment_id):
        require_text(shipment_id)
        self._id = shipment_id
        self._status = "ready"
        self._pending = []

    @property
    def status(self):
        return self._status

    @property
    def pending_events(self):
        return tuple(self._pending)

    def dispatch(self, event_id, tracking_code, occurred_at):
        if self._status != "ready":
            raise ValueError("Shipment is not ready")
        event = ShipmentDispatched(event_id, self._id, tracking_code, occurred_at)
        self._status = "dispatched"
        self._pending.append(event)
```

**demo.py — independent descriptions of one occurrence**

```python
from datetime import datetime, timezone
from model import Shipment


def archive_description(event):
    return f"archive: {event.shipment_id} {event.tracking_code}"


def notice_description(event):
    return f"notice: {event.shipment_id} {event.event_id}"


shipment = Shipment("S1")
when = datetime(2026, 10, 29, 10, 0, tzinfo=timezone.utc)
shipment.dispatch("E1", "TRACK-9", when)
fact = shipment.pending_events[0]
print("status:", shipment.status)
print("fact:", type(fact).__name__, fact.event_id)
for describe in (archive_description, notice_description):
    print(describe(fact))
try:
    shipment.dispatch("E2", "TRACK-10", when)
except ValueError as error:
    print("rejected:", error)
print("pending:", len(shipment.pending_events))
# status: dispatched
# fact: ShipmentDispatched E1
# archive: S1 TRACK-9
# notice: S1 E1
# rejected: Shipment is not ready
# pending: 1
```

Both description functions see the same immutable fact. They only return strings: nothing is sent, persisted, or acknowledged. The second dispatch fails without adding another event. Invalid event data likewise fails before the state change.

Python's [frozen dataclasses](https://docs.python.org/3/library/dataclasses.html#frozen-instances) emulate read-only fields; the strings and [UTC datetime](https://docs.python.org/3/library/datetime.html#aware-and-naive-objects) are immutable components. Pending-event access returns a tuple without draining the list. Production code must define when committed events are acknowledged or discarded on rollback.

This is a sequential in-memory model. It implements no unique-ID allocator, persistence, concurrent transition protection, reliable dispatcher, or consumer deduplication. Its accepted occurrence is local until a surrounding transaction commits.

## When to use it

Use domain events when experts name meaningful occurrences and several independent reactions need their original context. They help when adding a reaction repeatedly forces changes inside the entity that owns the transition.

A direct method call is simpler for one mandatory collaboration with clear ownership. A local event does not require a broker. A technical diagnostic log is sufficient when the information has no domain role.

## Tradeoffs and common mistakes

**Hidden workflows.** Indirection makes execution harder to follow. Document handlers, failure policies, and which reactions must precede success.

**Claims before commitment.** Publishing externally before commit can announce a rolled-back change; publishing afterward without durable coordination can lose the announcement.

**Mutable payloads and schema drift.** A live entity reference may reveal later state. Preserve occurrence data and evolve external contracts deliberately; corrections should be new facts rather than silent edits to history.

**Assuming order or exactly-once effects.** Parallel handlers, retries, and repeated delivery need explicit rules. A deduplication marker and its database effect must commit together to close their own crash gap; an external API needs an appropriate idempotency contract.

## Related patterns

[[aggregate|Aggregate]] owns state and invariants. Its operation can record a domain event without making asynchronous reactions part of the same consistency guarantee.

[[observer|Observer]] describes notification relationships. A domain event gives a notification business meaning and a fact payload; it does not dictate a subscription mechanism.

[[data-transactional-outbox|Transactional Outbox]] coordinates a state commit with durable publication intent. It addresses delivery obligations rather than defining the fact's meaning.

[[data-event-sourcing|Event Sourcing]] makes event history authoritative for reconstructing state. Domain events alone do not require storing every event or rebuilding aggregates from them.

## Sources

Evans's [DDD Reference, Domain Events on printed page 13](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) establishes the domain distinction. Fowler's [Domain Event draft](https://martinfowler.com/eaaDev/DomainEvent.html) and [Event Sourcing draft](https://martinfowler.com/eaaDev/EventSourcing.html) clarify event data and reconstruction. Bogard, Microsoft, Richardson, and Python documentation linked above support the implementation choices.

The shipment policy, code, and diagrams are original teaching material, not a complete shipping or messaging system.
