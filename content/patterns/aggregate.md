---
id: aggregate
type: pattern
title: Aggregate
summary: Group domain objects that must stay consistent behind one root, and make that boundary the unit of controlled change and atomic persistence.
status: published
aliases:
  - DDD Aggregate
  - Domain Aggregate
verses:
  - software-engineering
tags:
  - domain-modeling
  - consistency-boundaries
  - invariants
attribution: "Aggregate as described by Eric Evans, Martin Fowler, and Vaughn Vernon, with implementation context from official documentation. Original Patternverse load-plan example, code, and illustrations."
---

## Purpose and problem

A dispatcher adds packages to a vehicle's load plan. Each package has a positive weight, but the combined weight must also fit the plan's capacity. If callers can edit allocations independently, every allocation may look valid while their total exceeds the limit.

Gathering every related object into the plan creates another problem: package histories, customers, and delivery tracking now interfere with a small scheduling change. The design needs a boundary large enough to protect the shared rule and small enough to change independently.

## Core idea

An **Aggregate** is a domain consistency boundary containing a root entity and the entities or values whose rules it controls. Outside code requests changes through the root. The root accepts operations only when the resulting whole satisfies its invariants: conditions that must hold after accepted changes.

The mental model is **one boundary, one guardian, one consistent commit**. Evans's [DDD Reference, Aggregates](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) connects the object boundary with enforcement and transactions. Fowler's [DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) distinguishes this domain unit from a generic collection or UML aggregation.

DDD Aggregate and Domain Aggregate name this pattern here. **Aggregate root** names its entry-point entity, rather than a second name for every object inside it. A SQL aggregate function, analytics summary, or list of related records does not establish this consistency boundary.

![An application sends allocate(package_id, kg) to the LoadPlan root. Inside its boundary are a capacity of 100 kilograms and allocation values A at 60 kilograms and B at 40 kilograms. The root protects their combined weight. Package records remain outside and are referenced by ID.](../assets/software-engineering/aggregate-boundary.svg "The boundary contains the capacity rule and the allocations it governs. The application changes allocations through LoadPlan; referenced packages keep their independent lifecycle.")

## How it works

### Choose the rule before the object graph

Start with a concrete invariant, such as `sum(allocated kg) <= capacity kg`. Include the authoritative state needed to decide it. Objects shown on the same screen need not share an aggregate; a root with a few values can be sufficient.

[Vaughn Vernon's Effective Aggregate Design, Part I](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf) emphasizes real consistency requirements and small boundaries. Enlarging a boundary merely because one concept “has” another creates contention and loading costs. Shrinking it until a required rule depends on uncoordinated writes loses the reason for the boundary.

### Control changes and references

The root exposes meaningful commands, rather than a mutable child collection. Internal child entities can have identities meaningful within their owner; immutable values can be returned as snapshots. Do not leak a writable reference that bypasses the root's checks.

Other aggregates retain their own lifecycle. A load plan can remember a package ID without owning that package's tracking history. Microsoft's [domain-model guidance](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-domain-model) describes root-controlled updates and identity references between aggregates. An identifier does not prove the referenced object exists or authorize access to it.

### Carry the boundary into storage

Application code loads the root with the state needed for a command, invokes it, and saves its changed state atomically. Relational tables or a document can represent that state; storage layout does not determine the domain boundary.

Local validation alone cannot coordinate two loaded copies. With optimistic concurrency, saving must atomically check an expected aggregate version, write all changed members, and advance that version. A root-row token protects children only if every child-writing path participates. Microsoft's [concurrency documentation](https://learn.microsoft.com/en-us/ef/core/saving/concurrency) explains conditional writes and conflict detection.

After a conflict, reload and re-evaluate the business command. Blindly merging changes can invalidate the total. Locks or suitable database isolation are alternatives; naming a root supplies none of these mechanisms automatically.

![Two writers load version 7 of a plan holding 60 kilograms. One proposes adding 40 kilograms and the other 30 kilograms; both pass their local capacity check. The first atomic save advances to version 8 at 100 kilograms. The second save expects version 7 and is rejected. Re-evaluating its command against version 8 exceeds capacity.](../assets/software-engineering/aggregate-concurrency.svg "This is a required storage protocol for competing copies, not a feature of the in-memory example. The version check and the complete aggregate write must be atomic.")

## Worked example

### Guard a load plan through its root

Previously, a caller appended allocations and separately checked the total. Now `LoadPlan.allocate` builds a candidate state, validates its total, and replaces the internal state only on success. Setting an existing package's allocation replaces its weight instead of adding a duplicate entry.

Save these files together and run `python3 demo.py` using Python 3.10 or later. Weights are positive integer kilograms; identifiers are nonblank opaque text. This intentionally simplified plan checks weight only, without volume, axle distribution, or delivery ordering.

**model.py — root-controlled changes**

```python
from dataclasses import dataclass


def require_id(value):
    if type(value) is not str or not value.strip():
        raise ValueError("A nonblank identifier is required")


def require_kg(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Kilograms must be a positive integer")


@dataclass(frozen=True)
class Allocation:
    package_id: str
    kg: int

    def __post_init__(self):
        require_id(self.package_id)
        require_kg(self.kg)


class LoadPlan:
    def __init__(self, plan_id, capacity_kg):
        require_id(plan_id)
        require_kg(capacity_kg)
        self._plan_id = plan_id
        self._capacity_kg = capacity_kg
        self._allocations = {}

    @property
    def plan_id(self):
        return self._plan_id

    @property
    def allocations(self):
        return tuple(self._allocations.values())

    @property
    def total_kg(self):
        return sum(item.kg for item in self._allocations.values())

    def allocate(self, package_id, kg):
        allocation = Allocation(package_id, kg)
        proposed = {**self._allocations, package_id: allocation}
        if sum(item.kg for item in proposed.values()) > self._capacity_kg:
            raise ValueError("Capacity exceeded")
        self._allocations = proposed
```

**demo.py — accept the boundary, reject an excess**

```python
from model import LoadPlan


plan = LoadPlan("plan-42", 100)
plan.allocate("pkg-A", 60)
snapshot = plan.allocations
plan.allocate("pkg-B", 40)
print("total kg:", plan.total_kg)
try:
    plan.allocate("pkg-C", 1)
except ValueError as error:
    print("rejected:", error)
print("unchanged kg:", plan.total_kg)
plan.allocate("pkg-B", 30)
print("revised kg:", plan.total_kg)
print("earlier snapshot kg:", sum(item.kg for item in snapshot))
# total kg: 100
# rejected: Capacity exceeded
# unchanged kg: 100
# revised kg: 90
# earlier snapshot kg: 60
```

The exact-capacity plan succeeds. The extra kilogram fails before state changes. Replacing B's weight lowers the total to 90, while the earlier snapshot still describes 60 kilograms. The tuple and frozen allocation values prevent normal callers from editing live members through that snapshot. Python's [frozen dataclass documentation](https://docs.python.org/3/library/dataclasses.html#frozen-instances) explains the limits of this emulated immutability; underscore fields remain a convention.

This is one in-memory root with sequential calls. It implements no persistent transaction, version check, package lookup, or uniqueness across plans. Two plans can reference the same package; exclusive assignment would require an additional explicit consistency design.

## When to use it

Use an Aggregate when operations must preserve rules across several owned values or entities, and independent setters keep creating invalid combinations. An order with governed lines or a roster requiring its captain to remain a member presents similar signals.

A single validated record or simple transaction script can be sufficient when rules are straightforward. Read-only screens may join several aggregates into a projection without combining their write boundaries.

## Tradeoffs and common mistakes

**An oversized root.** Unbounded histories increase memory and loading costs; unrelated writes compete for one lock or version. Keep only the state required for the invariant.

**An aggregate per table.** Splitting by storage structure can leave the shared rule unenforced. Conversely, an ORM relationship does not establish ownership.

**Assuming local success means durable success.** A process can fail before commit. External effects should follow an explicit delivery design; saving a plan and notifying another system are separate failure points.

**Ignoring rules across boundaries.** One aggregate cannot enforce a global rule using stale information about another. Prefer one-aggregate transactions as a design goal; negotiate delayed consistency where acceptable, or deliberately choose stronger coordination. Retried or reordered messages need explicit duplicate handling and ordering policies. A deployment or microservice boundary is a different decision.

## Related patterns

[[entity|Entity]] explains continuing domain identity. The root is an entity; an internal entity need not be independently accessible.

[[value-object|Value Object]] supplies descriptive immutable values. The example's allocations are values owned by a mutable root.

[[domain-model|Domain Model]] organizes business behavior more broadly. Aggregates identify the units whose rules and changes must remain coherent.

[[data-document-aggregates|Document Aggregates]] groups owned data for document storage. It can implement this boundary, while an embedded document still needs domain validation and concurrency protection.

## Sources

Evans's [DDD Reference, Aggregates on printed page 16](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) establishes the pattern. [Fowler](https://martinfowler.com/bliki/DDD_Aggregate.html) clarifies roots and overloaded terminology; [Vernon, Part I](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf) develops consistency-driven sizing. Microsoft and Python documentation linked above support the implementation details.

The load-plan policy, code, and diagrams are original teaching material. They do not model a complete dispatch or vehicle-safety system.
