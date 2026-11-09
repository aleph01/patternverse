---
id: service-layer
type: pattern
title: Service Layer
summary: Define application operations at a shared boundary that coordinates domain behavior, persistence, and transaction outcomes for different callers.
status: published
aliases:
  - Application Service Layer
  - Application Services
verses:
  - software-engineering
tags:
  - domain-modeling
  - application-boundary
  - use-case-coordination
attribution: "Service Layer, contributed by Randy Stafford to Patterns of Enterprise Application Architecture, with supporting guidance from Harry Percival and Bob Gregory. Original Patternverse workshop-booking example, code, and illustrations."
---

## Purpose and problem

A workshop accepts bookings through a website and an administrator's command-line tool. Both interfaces must load availability, apply the same capacity rule, record a booking, and save the remaining seats together. The website commits both changes; the command-line tool forgets the booking record. Capacity disappears without anyone knowing who booked it.

Copying the sequence into every interface makes application behavior depend on the caller. The interfaces need different input and output formats, but the operation they request should have one reliable home.

## Core idea

A **Service Layer** defines the operations an application offers and coordinates their execution. Clients ask for a meaningful outcome, such as booking seats, rather than assembling database calls and domain decisions themselves.

The mental model is **one application operation, several ways to call it**. Randy Stafford's [Service Layer catalog entry](https://martinfowler.com/eaaCatalog/serviceLayer.html) establishes the boundary and its coordination role. Application Service Layer and Application Services describe this role here. It can be an ordinary function or module; it requires neither a network endpoint nor a dependency-injection framework.

![A web adapter and a command-line adapter both call book on the service layer. The service coordinates loading, invoking Workshop.after_booking, writing availability and the booking record, then committing. Workshop owns the capacity rule; SQLite owns persistence and locking.](../assets/software-engineering/service-layer-boundary.svg "Callers handle their interface. The service owns the use-case sequence, the model owns the rule, and the database supplies the transaction mechanism.")

## How it works

### Give each responsibility a clear owner

An adapter parses HTTP fields or command-line arguments, obtains a trusted caller identity where required, and translates outcomes into its own response format. The service accepts application-level inputs and coordinates loading, permission checks, domain behavior, and persistence. Dependencies can be passed explicitly.

With a domain model, business rules remain with the objects or domain services that express them. Here, the workshop decides whether seats fit. The application operation decides when to load that workshop and how to save the resulting changes. Percival and Gregory's [Service Layer chapter](https://www.cosmicpython.com/book/chapter_04_service_layer.html) demonstrates this separation from both web handling and domain services.

A service layer can also expose operations implemented using [Transaction Scripts](https://martinfowler.com/eaaCatalog/transactionScript.html). A rich object model is a choice, not a prerequisite. The boundary and the organization of business rules answer different questions.

### Define success and failure together

For booking, success means both the capacity update and booking row have committed. Return a result only after that point. Unknown workshops, insufficient seats, duplicate booking IDs, and storage failures must remain distinguishable to callers.

Transaction ownership must be explicit. This example requires an idle connection and owns its transaction; nesting it inside another transaction is rejected. The caller opens and closes the connection. A larger application could delegate transaction management to a Unit of Work while keeping the same operation boundary.

### Specify guarantees beyond the function call

Naming a function `book` supplies no concurrency protection. The example obtains an SQLite write transaction before reading availability. [SQLite documents](https://sqlite.org/lang_transaction.html) that `BEGIN IMMEDIATE` can fail when another writer is active. Production callers need an explicit contention policy; a lock error is not a successful booking or evidence of insufficient seats.

Authorization must apply consistently across entry points. This demonstration has no caller identities and implements no permission checks. Sending email after commit can still fail; sending it before commit can announce a booking that later rolls back. Durable external delivery needs an additional protocol. The operation's local transaction does not include a mail server.

![The booking operation begins a write transaction, reads availability, applies the domain rule, updates remaining seats, and inserts the booking row. Commit makes both writes visible together. If the insert fails because a booking ID already exists, rollback restores the earlier capacity update and the caller receives an error.](../assets/software-engineering/service-layer-transaction.svg "A failure after the first write must undo that write too. The application coordinates the boundary; the database makes these local changes atomic.")

## Worked example

### Share a booking operation, including its rollback path

Before the change, each interface reproduced the booking sequence. Afterward, both supply the same inputs to `book`. Save these three files together and run `python3 demo.py` with Python 3.10 or later and its standard-library SQLite module.

Counts are whole seats. IDs are nonblank opaque text. Use an idle connection configured with `isolation_level=None`; transaction control below uses explicit SQL. Python's [connection documentation](https://docs.python.org/3/library/sqlite3.html#transaction-control-via-the-isolation-level-attribute) explains this configuration. No web server or command-line parser is needed to demonstrate the shared operation.

**model.py — the capacity rule**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Workshop:
    seats_left: int

    def __post_init__(self):
        if type(self.seats_left) is not int or self.seats_left < 0:
            raise ValueError("Invalid availability")

    def after_booking(self, seats):
        if type(seats) is not int or seats <= 0:
            raise ValueError("Seats must be a positive integer")
        if seats > self.seats_left:
            raise ValueError("Not enough seats")
        return self.seats_left - seats
```

**application.py — the shared operation**

```python
from model import Workshop


def book(db, booking_id, workshop_id, seats):
    if any(type(i) is not str or not i.strip() for i in (booking_id, workshop_id)):
        raise ValueError("Nonblank IDs required")
    if db.isolation_level is not None or db.in_transaction:
        raise RuntimeError("Idle explicit-transaction connection required")
    db.execute("BEGIN IMMEDIATE")
    try:
        row = db.execute(
            "SELECT seats_left FROM workshops WHERE id = ?", (workshop_id,)
        ).fetchone()
        if row is None:
            raise LookupError("Unknown workshop")
        left = Workshop(row[0]).after_booking(seats)
        db.execute("UPDATE workshops SET seats_left = ? WHERE id = ?", (left, workshop_id))
        db.execute("INSERT INTO bookings VALUES (?, ?, ?)", (booking_id, workshop_id, seats))
        db.execute("COMMIT")
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise
    return left
```

**demo.py — two callers and a failed second write**

```python
import sqlite3
from contextlib import closing
from application import book


with closing(sqlite3.connect(":memory:", isolation_level=None)) as db:
    db.execute("CREATE TABLE workshops (id TEXT PRIMARY KEY, seats_left INTEGER NOT NULL CHECK(seats_left >= 0))")
    db.execute("CREATE TABLE bookings (id TEXT PRIMARY KEY, workshop_id TEXT NOT NULL, seats INTEGER NOT NULL CHECK(seats > 0))")
    db.execute("INSERT INTO workshops VALUES ('W-1', 3)")
    print("web seats left:", book(db, "B-1", "W-1", 2))
    try:
        book(db, "B-1", "W-1", 1)
    except sqlite3.IntegrityError:
        print("duplicate: rolled back")
    print("after duplicate:", db.execute("SELECT seats_left FROM workshops").fetchone()[0])
    print("CLI seats left:", book(db, "B-2", "W-1", 1))
    print("booking rows:", db.execute("SELECT COUNT(*) FROM bookings").fetchone()[0])
# web seats left: 1
# duplicate: rolled back
# after duplicate: 1
# CLI seats left: 0
# booking rows: 2
```

The duplicate attempt temporarily decrements availability, then fails on the primary key. Rollback restores the seat, allowing the second caller to take the exact final seat. Both successful bookings are recorded. The return value is remaining seats immediately after this operation, not a promise that availability stays unchanged afterward.

This bounded example uses a real local transaction but an in-memory database. Duplicate IDs are rejected; retrying does not return the previous result. It implements no durable retry identity policy, authentication, notification, waitlist, cancellation, or cross-database transaction.

## When to use it

Use a service layer when multiple entry points repeat the same operation, transaction handling drifts between callers, or use cases are hard to test without running a user interface. A stable application boundary also helps adapters change without rewriting coordination.

For a small read-only tool or a straightforward single caller, a focused function may already be enough. Do not add forwarding classes merely to satisfy a folder diagram.

## Tradeoffs and common mistakes

**A procedural dumping ground.** Moving every business rule into services can hollow out a useful domain model. Fowler's [Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html) explains that failure. Keep the service focused on the operation and its collaborators.

**Leaking interface details.** HTTP request objects and response codes make the boundary difficult to reuse. Translate them at the adapter.

**An oversized transaction.** Slow remote calls hold locks and introduce failures a local rollback cannot undo. Keep transaction scope deliberate.

**Ambiguous retries.** A caller may lose the response after commit. Repeating a request without a defined identity and outcome policy can repeat its effects.

## Related patterns

[[domain-service|Domain Service]] expresses a domain operation with no natural entity or value-object owner. Service Layer coordinates the surrounding application use case.

[[domain-model|Domain Model]] owns business behavior and state; an application service loads it, invokes it, and arranges persistence.

[[layers|Layers]] orders responsibilities more broadly. Service Layer identifies one particular application boundary within such an arrangement.

[[facade|Facade]] simplifies access to a subsystem. A service layer may act as a facade, with the additional application-level responsibility of defining operations and coordinating their outcomes.

## Sources

Randy Stafford's [Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html), in *Patterns of Enterprise Application Architecture*, establishes the pattern. [Architecture Patterns with Python, chapter 4](https://www.cosmicpython.com/book/chapter_04_service_layer.html), by Harry Percival and Bob Gregory, supports the application/domain distinction. Fowler's catalogs and Python/SQLite documentation linked above support the implementation choices and cautions.

The workshop, booking policy, executable example, and illustrations are original teaching material.
