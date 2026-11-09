---
id: saga
type: pattern
title: Saga
summary: Coordinate a business operation as locally committed steps, with explicit recovery and compensating actions when the overall operation cannot complete.
status: published
aliases:
  - Sagas
tags:
  - software-engineering
  - distributed-data
  - coordination
  - compensation
verses:
  - software-engineering
attribution: Hector Garcia-Molina and Kenneth Salem, Sagas (1987); distributed-service interpretation from Chris Richardson and implementation guidance from Microsoft and Temporal. Original Patternverse reservation simulation and illustrations.
---

## Purpose and problem

An order reserves two mugs in Inventory, reserves a packing slot, then asks a carrier to accept delivery. Inventory and Packing have already committed when the carrier declines. One database rollback cannot reach those earlier effects across independent owners. Leaving both reservations active wastes resources; restoring Inventory's original stock count could erase someone else's reservation.

The business needs a defined outcome despite partial progress. Holding locks throughout a long workflow is undesirable, and a shared atomic transaction may be unavailable or inappropriate. Recovery must become part of the business process.

## Core idea

**Commit locally; coordinate the outcome.** A Saga is a sequence of local transactions with an explicit plan for completing the operation or compensating its accepted steps. Garcia-Molina and Salem introduced *sagas* for long-lived transactions that permit interleaving. The modern service pattern applies this idea across independently owned data.

A compensation is a new business operation, such as releasing a particular reservation. It does not erase the earlier commit or restore global transaction isolation. Compensating Actions supplies the recovery mechanism; Saga coordinates the larger sequence and outcome.

![Inventory reserves two mugs for O42, Packing reserves one slot, and Carrier declines delivery without committing it. Compensation releases the packing slot and then the Inventory reservation. Each effect belongs to its participant; there is no shared rollback.](../assets/software-engineering/saga-sequence.svg "Forward steps commit separately. This example compensates Packing before Inventory; the order follows its declared plan, not a universal requirement for every business workflow.")

## How it works

### Choose who coordinates

With **orchestration**, a coordinator tracks progress, sends commands, and interprets outcomes. With **choreography**, participants react to events and publish subsequent outcomes. Both need explicit completion and recovery rules; choreography does not remove those responsibilities.

Each participant owns its local invariants and transaction. A real coordinator needs durable progress and stable saga/operation identities. Persist outbound intent with progress changes where required, and handle repeated messages. Starting a saga is not evidence that all participants completed it.

### Separate refusal from uncertainty

A business refusal can trigger compensation. A timeout may mean the effect committed but its reply disappeared. Reconcile or retry using the same operation identity before treating uncertainty as absence. Record enough recovery intent before calling a participant to locate an effect whose acknowledgment never arrives.

Compensation can also fail. Retain pending work, bound retries, and expose unresolved cases for repair. Irreversible actions need careful placement and an explicit business remedy; no catch block can make them reversible.

Sagas lack automatic cross-participant isolation. Reservations, semantic pending states, versions, or other domain-specific controls can prevent inappropriate use of intermediate state. These controls require design; compensation alone supplies none of them.

![Inventory starts with five mugs. O42 reserves two, and another order O99 reserves one, leaving two available. O42's carrier declines. Packing is released, Inventory release temporarily fails, and a later retry releases only O42's two mugs. Four remain available; O99 still holds one.](../assets/software-engineering/saga-recovery.svg "Compensation reaches an acceptable new state, not the original snapshot. The retry uses the same in-memory coordinator state; this simulation does not recover across process crashes.")

## Worked example

### Preserve the other order

O42 reserves two mugs and a packing slot, then the carrier refuses. Packing compensation succeeds, but releasing O42’s mugs is temporarily unavailable. Another order, O99, has reserved one mug in the meantime. Resuming compensation releases only O42’s reservation: four mugs and one packing slot are free, and O99 keeps its one mug.

Follow the plan’s forward actions, the recorded compensation position, and the resumed release. The terminal outcome is compensated, not fulfilled.

Save `saga.py` and `demo.py` together and run `python3 demo.py` with Python 3.11+. Each `Pool` models a participant with atomic calls and its own reservation ledger. Units are physical mugs or packing slots; capacities and quantities are integers from 1 to 1000. Reservation keys are trusted, nonempty application-generated strings, unique within each pool.

The fixed plan registers forward and compensation functions before execution. A definitive `Declined` means the identified operation has no active forward effect. `Unavailable` means uncertainty: retry the same forward operation, or retain the pending compensation. One caller owns the coordinator; the same plan and state object must be supplied on every resume.

```python
from dataclasses import dataclass, field
from typing import Callable


class Declined(Exception):
    pass


class Unavailable(Exception):
    pass


@dataclass
class Pool:
    capacity: int
    held: dict[str, int] = field(default_factory=dict)
    closed: set[str] = field(default_factory=set)

    def __post_init__(self):
        if type(self.capacity) is not int or not 1 <= self.capacity <= 1000:
            raise ValueError("Invalid capacity")

    @property
    def available(self):
        return self.capacity - sum(self.held.values())

    def reserve(self, key, quantity):
        if type(quantity) is not int or not 1 <= quantity <= 1000:
            raise ValueError("Invalid quantity")
        if key in self.closed:
            raise Declined("Reservation closed")
        if key in self.held:
            if self.held[key] != quantity:
                raise ValueError("Conflicting operation identity")
            return
        if quantity > self.available:
            raise Declined("Insufficient capacity")
        self.held[key] = quantity

    def release(self, key):
        self.closed.add(key)
        self.held.pop(key, None)


@dataclass(frozen=True)
class Step:
    forward: Callable[[], None]
    compensate: Callable[[], None]


@dataclass
class Saga:
    phase: str = "forward"
    done: int = 0


def advance(saga, steps):
    if saga.phase == "forward":
        while saga.done < len(steps):
            try:
                steps[saga.done].forward()
            except Unavailable:
                return "waiting_forward"
            except Declined:
                saga.phase = "compensating"
                break
            saga.done += 1
        else:
            saga.phase = "completed"
    if saga.phase == "compensating":
        while saga.done:
            try:
                steps[saga.done - 1].compensate()
            except Unavailable:
                return "waiting_compensation"
            saga.done -= 1
        saga.phase = "compensated"
    return saga.phase
```

The carrier refuses after another order reserves one mug. Inventory's first compensation attempt is unavailable; the next call resumes it. The completed Packing compensation is not repeated.

```python
from saga import Pool, Step, Saga, advance, Declined, Unavailable


stock, packing = Pool(5), Pool(1)
order = "O42"
release_attempts = 0


def carrier():
    stock.reserve("O99", 1)  # Legitimate intervening work.
    raise Declined("Carrier does not serve destination")


def release_stock():
    global release_attempts
    release_attempts += 1
    if release_attempts == 1:
        raise Unavailable("Inventory temporarily unreachable")
    stock.release(order)


steps = (
    Step(lambda: stock.reserve(order, 2), release_stock),
    Step(lambda: packing.reserve(order, 1), lambda: packing.release(order)),
    Step(carrier, lambda: None),  # In this scenario Carrier always declines.
)
state = Saga()
print(advance(state, steps), stock.available, packing.available, state.done)
print(advance(state, steps), stock.available, packing.available, state.done)
print("other order:", stock.held["O99"])
```

The first two lines report status, free mugs, free packing slots, and accepted steps still awaiting compensation. Output is `waiting_compensation 2 1 1`, then `compensated 4 1 0`, then `other order: 1`. Before resuming, O42 still holds two mugs while its packing slot is already free. Afterward, only O99 holds stock. Repeating a release is harmless, and a closed key cannot reserve again.

This is a bounded sequential simulation, with no database, network, concurrent threads, durable journal, scheduler, or crash recovery. Participant calls model local transactions; dictionary assignments do not implement production transactions. Real systems must persist participant effects and repeat-protection state atomically, serialize coordinator ownership, retain plan versions, and recover uncertain outcomes. The terminal “compensated” state is not order fulfillment.

## When to use it

Use a Saga when one business operation spans independently committed resources and can tolerate visible intermediate states plus explicit recovery. Each meaningful failure needs a workable remedy or a clearly owned unresolved outcome.

If one ordinary local transaction can enforce the rules, prefer it. If temporary inconsistency is unacceptable or irreversible effects have no acceptable remedy, reconsider the boundary or coordination protocol rather than assuming a Saga makes the operation atomic.

## Tradeoffs and common mistakes

Recovery logic, timers, correlation, repeat handling, progress storage, and operational repair add substantial complexity. Pending operations need observable status and ownership. An outage can leave compensation incomplete; liveness depends on eventual recovery or intervention.

Do not compensate every exception blindly. Do not restore a whole old snapshot, release another operation's reservation, or replay irreversible effects during recovery. A late forward request must not resurrect an already cancelled reservation. This example retains closed keys for that reason; production retention must cover possible late arrivals.

Reverse order is useful for this sequential plan. Real business dependencies can require a different order or parallel recovery. Choreography can obscure those dependencies as participants grow; orchestration concentrates workflow responsibility and needs resilient execution.

## Related patterns

- [[data-compensating-actions|Compensating Actions]] defines scoped recovery operations. Saga coordinates their use alongside forward progress.
- [[database-per-service|Database per Service]] establishes independent data ownership; Saga is one way to coordinate a business operation across those owners.
- [[data-transactional-outbox|Transactional Outbox]] can persist outgoing intent with a local change. It does not decide the Saga's business outcome.
- [[idempotent-receiver|Idempotent Receiver]] protects participant effects when stable operation identities are delivered repeatedly.

## Sources

- [Garcia-Molina and Salem: Sagas (1987)](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf), sections 1–5, introduces interleaved local transactions, compensation, and logged recovery.
- [Richardson: Saga](https://microservices.io/patterns/data/saga.html) explains the distributed-service form, orchestration, choreography, and lack of isolation.
- Microsoft: [Saga](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) and [Compensating Transaction](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) discuss coordination, application-specific recovery, concurrent work, and unresolved failures.
- Temporal: [Saga pattern](https://docs.temporal.io/design-patterns/saga-pattern) and [Compensating actions](https://temporal.io/blog/compensating-actions-part-of-a-complete-breakfast-with-sagas) discuss workflow recovery and registering compensation before uncertain effects.

The mug/packing/carrier scenario, code, and diagrams are original teaching material.
