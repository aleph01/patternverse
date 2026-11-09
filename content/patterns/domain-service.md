---
id: domain-service
type: pattern
title: Domain Service
summary: Express a meaningful domain operation that has no natural entity or value-object owner as a focused, stateless service with a domain-language contract.
status: published
aliases:
  - DDD Domain Service
  - Domain Service Pattern
verses:
  - software-engineering
tags:
  - domain-modeling
  - business-rules
  - responsibility-assignment
attribution: "Domain Service as described by Eric Evans, with supporting context from Vaughn Vernon, Martin Fowler, Randy Stafford, and official documentation. Original Patternverse room-selection policy, code, and illustrations."
---

## Purpose and problem

A workshop needs a room with enough seats and a projector. Several rooms qualify. The booking screen chooses the smallest suitable room, but an import job simply chooses the first candidate. Identical requests produce different decisions depending on their entry point.

A room can describe whether it fits a request. Choosing among rooms, however, belongs to no individual room. Putting that comparison on the request would make a small description responsible for searching and ranking an entire candidate set. The model needs a named home for the selection policy.

## Core idea

A **Domain Service** represents a significant domain operation that does not naturally belong to an entity or value object. Its contract uses the domain's language, inputs, and outcomes. It participates in the model rather than providing a generic place for miscellaneous application code.

The mental model is **give an ownerless business operation a name and a contract**. Evans's [DDD Reference, Services](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) establishes this responsibility choice. Domain services are stateless in the sense that they do not retain the evolving business situation between calls. They can use supplied state, immutable configuration, or explicit dependencies.

Evans's catalog calls this Services; the domain qualifier resolves the overloaded term. DDD Domain Service and Domain Service Pattern refer to this pattern here. It does not imply a network service, microservice, dependency-injection registration, or a class named `SomethingService`. A module-level function can implement the contract.

![A booking use case supplies a workshop request and room-offer snapshots to the select_room domain service. RoomOffer.can_host checks each offer's own compatibility; select_room compares qualifying offers by seat count and room ID, then returns a selected offer or no match.](../assets/software-engineering/domain-service-responsibilities.svg "Local compatibility stays with RoomOffer. The domain service owns comparison across candidates; the application owns loading inputs and acting on the result.")

## How it works

### Separate a decision from its surrounding use case

A domain service answers a business question such as “which suitable room should we choose?” An application service coordinates authentication, loading candidates, invoking that decision, booking through the owner, and committing. Microsoft's [tactical DDD guidance](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-domain-driven-design) distinguishes these roles. The [Service Layer catalog](https://martinfowler.com/eaaCatalog/serviceLayer.html) describes the wider application boundary; the names are not interchangeable.

Keep behavior with an existing owner when that owner already has the necessary meaning and information. Fowler's [Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html) warns about moving all domain behavior into procedural services. The room offer's compatibility method remains useful even after selection becomes a separate operation.

### Make the contract explicit

Specify units, admissible inputs, selection rules, and the difference between rejection and failure. This example accepts a finite set of candidate snapshots already obtained for the requested time. It chooses the suitable room with the fewest seats; a case-sensitive room-ID ordering resolves equal capacities. That tie policy makes results independent of input order.

No match is an ordinary domain outcome. Malformed or ambiguous input is an error. A failed availability query must not silently become an empty list: “no room fits these supplied offers” differs from “availability could not be determined.”

### Stateless does not mean pure or atomic

The example is pure, but purity is an implementation choice. A different domain service might consult a domain-shaped accreditation query through an explicit port. Its adapter handles transport; a timeout needs an explicit failure policy. A stored “last customer” or mutable per-request result would instead introduce hidden history and sharing hazards.

Vernon's [chapter overview for Services](https://www.informit.com/content/images/9780321834577/samplepages/0321834577.pdf) describes focused stateless domain services, including integration uses. Statelessness alone guarantees neither thread safety of dependencies nor atomic changes across aggregates.

![The application obtains candidate snapshots, asks the domain service to select a room, and submits a booking command to the room owner. If the selected room has been taken meanwhile, the booking is rejected and the application reloads candidates and re-evaluates selection.](../assets/software-engineering/domain-service-selection-booking.svg "Selection is a decision over supplied snapshots. The room owner and its persistence mechanism must protect booking against concurrent changes; the domain service does not reserve the result.")

## Worked example

### Choose consistently without taking ownership of rooms

Previously, each caller repeated an eligibility loop and a different ranking rule. Both now call `select_room`. The function compares immutable offers without changing them or storing the selected result globally.

Save these files together and run `python3 demo.py` with Python 3.10 or later. Counts are whole seats and attendees. Feature names and room IDs use exact text comparison; the example performs no fuzzy matching or normalization.

**model.py — local eligibility and cross-candidate selection**

```python
from dataclasses import dataclass


def positive_count(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Count must be a positive integer")


def feature_set(value):
    if type(value) is not frozenset or any(
        type(item) is not str or not item.strip() for item in value
    ):
        raise ValueError("Use a frozenset of nonblank feature names")


@dataclass(frozen=True)
class RoomRequest:
    attendees: int
    needs: frozenset[str]

    def __post_init__(self):
        positive_count(self.attendees)
        feature_set(self.needs)


@dataclass(frozen=True)
class RoomOffer:
    room_id: str
    seats: int
    features: frozenset[str]

    def __post_init__(self):
        if type(self.room_id) is not str or not self.room_id.strip():
            raise ValueError("A nonblank room ID is required")
        positive_count(self.seats)
        feature_set(self.features)

    def can_host(self, request):
        if type(request) is not RoomRequest:
            raise TypeError("RoomRequest required")
        return self.seats >= request.attendees and request.needs <= self.features


def select_room(request, offers):
    if type(request) is not RoomRequest:
        raise TypeError("RoomRequest required")
    offers = tuple(offers)
    if any(type(offer) is not RoomOffer for offer in offers):
        raise TypeError("RoomOffer candidates required")
    ids = [offer.room_id for offer in offers]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate room IDs")
    suitable = (offer for offer in offers if offer.can_host(request))
    return min(suitable, key=lambda offer: (offer.seats, offer.room_id), default=None)
```

**demo.py — exact fit, stable tie, and no match**

```python
from model import RoomOffer, RoomRequest, select_room


projector = frozenset({"projector"})
request = RoomRequest(12, projector)
offers = (
    RoomOffer("room-C", 20, projector),
    RoomOffer("room-B", 12, projector),
    RoomOffer("room-A", 12, projector),
    RoomOffer("room-D", 10, projector),
)
selected = select_room(request, offers)
print("selected:", selected.room_id)
print("spare seats:", selected.seats - request.attendees)
print("reordered:", select_room(request, reversed(offers)).room_id)
print("no match:", select_room(RoomRequest(21, projector), offers))
print("still offered:", len(offers))
# selected: room-A
# spare seats: 0
# reordered: room-A
# no match: None
# still offered: 4
```

A twelve-seat room accepts exactly twelve attendees. A wins the tie with B by ID; reversing candidates does not change the decision. No candidate fits twenty-one attendees. The original four offers remain intact.

Python's [`min` contract](https://docs.python.org/3/library/functions.html#min) supports the key and empty-result behavior. The tuple materialization requires memory proportional to candidate count. [Frozen dataclasses](https://docs.python.org/3/library/dataclasses.html#frozen-instances), integers, strings, and frozen sets keep these snapshots immutable through normal API use; they are not a security boundary against deliberate runtime bypass.

The caller supplies a consistent, authorized view for the requested time. These types contain no calendar or booking state. Another caller could select the same room from the same snapshots. Actual booking must revalidate availability through its owner and use appropriate concurrency protection. On conflict, reload and reconsider; selecting again against the same stale offers supplies no new guarantee.

## When to use it

Use a domain service when experts name an operation or policy that spans several domain objects, yet assigning it to one would distort that object's responsibility. Duplicated business decisions across entry points are another signal.

If a room can decide its own compatibility, keep that method on the room description. If the code merely loads, saves, and sends a response, an application-level function may suffice. A separate class hierarchy is unnecessary for one stable operation.

## Tradeoffs and common mistakes

**A generic service drawer.** `BusinessService` accumulating selection, billing, and notifications obscures boundaries. Name one cohesive domain responsibility.

**A model emptied of behavior.** Extracting a service should not remove the rules naturally owned by entities and values. Extra indirection needs a responsibility benefit.

**Hidden inputs and effects.** Clock reads, mutable caches, transport calls, and global request state complicate reproducibility and failure handling. Expose dependencies and their lifecycle; caller-supplied snapshots can still be stale or incomplete.

**Treating a decision as a commit.** Coordinating several objects does not establish a transaction boundary. Failed writes, retries, and duplicate external effects still need application and persistence policies. A deterministic choice also does not establish fairness: repeatedly favoring the same ID is an explicit tradeoff of this teaching policy.

## Related patterns

[[domain-model|Domain Model]] places business behavior in a model. A Domain Service adds a focused operation while retaining behavior on natural object owners.

[[aggregate|Aggregate]] protects an invariant through a root and a consistency boundary. Calling a service across several aggregates does not combine their commits.

[[ports-and-adapters|Ports and Adapters]] separates domain contracts from technical integrations. A domain service can depend on a domain-shaped port without owning its HTTP or database adapter.

[[strategy|Strategy]] makes alternative algorithms interchangeable. A domain service may use a Strategy when its policy varies; a single domain operation does not require interchangeable implementations.

## Sources

Evans's [DDD Reference, Services on printed page 14](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) establishes the operation and contract. Vernon's [Services chapter overview](https://www.informit.com/content/images/9780321834577/samplepages/0321834577.pdf) supports statelessness. Microsoft, the Service Layer catalog, Fowler, and Python documentation linked above support the distinctions and implementation details.

The room-selection policy, Python code, and diagrams are original teaching material. The example is not a complete scheduling or booking system.
