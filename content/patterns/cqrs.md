---
id: cqrs
type: pattern
title: CQRS
summary: Separate the model that handles business changes from the model that answers queries, so each can serve its own responsibilities without forcing one representation to do both.
status: published
aliases:
  - Command Query Responsibility Segregation
  - Command and Query Responsibility Segregation
  - Command-Query Responsibility Segregation
tags:
  - software-engineering
  - persistence
  - read-write-models
verses:
  - software-engineering
attribution: Greg Young, CQRS Documents; Martin Fowler, CQRS; implementation context from Microsoft and SQLite documentation. Original Patternverse seat-booking example and illustrations.
---

## Purpose and problem

A booking application uses one object model for allocating seats and displaying availability cards. Booking needs capacity rules and transaction control. The card needs a title, remaining seats, and a short status. Adding display requirements increasingly distorts the booking model; rendering a list loads behavior and state it never uses.

The application must protect booking correctness while letting queries return useful shapes efficiently. Splitting code into `read` and `write` folders will not help unless those responsibilities stop depending on one overloaded model.

## Core idea

**CQRS**, expanded as **Command Query Responsibility Segregation**, separates models for changing information and reading it. Commands express business intent and enforce rules. Queries provide representations suited to their consumers without changing business state.

The mental model is **decide changes with one model; answer questions with another**. Greg Young also uses the expansion Command and Query Responsibility Segregation. The related Command Query Separation principle classifies individual methods; CQRS applies a model-level separation. Event Sourcing instead concerns storing state as a history of events. It can accompany CQRS, but is not required.

Distinct models can share one database. Separate databases, asynchronous projections, queues, and independently deployed services are further choices. Two HTTP verbs or a read replica behind the same conceptual model do not by themselves establish CQRS.

![A Book Seats command goes through a SeatPool model that checks capacity and changes booked seats. An Availability query uses SQL to return an immutable title, remaining count, status, and observed version. Both paths access one shows table; the query does not load the command model or perform booking.](../assets/software-engineering/cqrs-models.svg "The separation is between responsibilities and representations. This example shares storage and derives its read DTO on demand; it has no asynchronous projection or event log.")

## How it works

### Give the command and query different jobs

A command such as `BookSeats(show_id, quantity)` requests an outcome, rather than exposing a generic setter for `booked`. The write side validates input, checks current authoritative state, and commits only an acceptable change. A query can bypass that behavioral model and directly build a suitable data transfer object, or DTO.

Keep authorization on both paths. A command must check permission to perform its action, while a query must expose only fields the caller may read. Separate models do not establish those permissions automatically. Their connection privileges, lifecycle, and ownership remain explicit responsibilities.

### Choose consistency rather than inheriting a slogan

A synchronous shared-store implementation can answer a new query from committed state. That does not keep a previously returned DTO current. Commands must still validate at execution time, using a concurrency policy such as serialized writes or version checking.

With asynchronous read projections, successful command completion may precede query visibility. Define what acknowledgment means—accepted for processing or committed—and how clients handle pending changes, observation versions, and projection failures. A version is freshness evidence; it becomes a concurrency precondition only if the command checks it.

Separate stores also need reliable propagation, duplicate handling, ordering, and rebuild plans. An outbox can couple publication intent with a local commit. Event Sourcing supplies a possible replay source, not a prerequisite for separating models. Neither architecture makes stale reads safe for decisions that require authoritative current state.

![An availability DTO reports two remaining seats at version zero. A later booking command commits both seats and advances the stored version to one. The old DTO still reports two. A new command for one seat validates current state and rejects it; a fresh query reports zero, sold out, version one.](../assets/software-engineering/cqrs-freshness.svg "Even without an asynchronous read store, a returned answer can become outdated. The command enforces capacity from current state; the displayed remaining count is not write authority.")

## Worked example

### Seat rules and an availability card

The query first reports two available seats at version zero. A booking command takes both seats; the earlier query result still says two, while a fresh query says zero and sold out at version one. Another booking is rejected from current state. This is the separation to follow: `book_seats` enforces the capacity rule, while `availability` builds a display record.

The complete files below retain the transaction and validation details needed to make that trace reproducible.

Save these two files together and run `python3 demo.py` with Python 3.11 or later. `cqrs.py` has an immutable command-side `SeatPool` and a separate immutable query DTO. Quantities count physical seats and must be integers from 1 to 1000. Show IDs are ASCII identifiers of 1–64 characters. Seeded capacity is 1–1000 seats.

The write connection is dedicated and initially idle. `BEGIN IMMEDIATE` serializes SQLite writers before loading state; the context commits or rolls back the open transaction. The read connection opens the same file in read-only mode. Callers close both connections. Connection modes help prevent accidental writes, rather than providing a complete process or authentication boundary.

```python
from dataclasses import dataclass
from pathlib import Path
import re
import sqlite3


class SoldOut(ValueError):
    pass


@dataclass(frozen=True)
class SeatPool:
    capacity: int
    booked: int

    def after_booking(self, quantity):
        if type(quantity) is not int or not 1 <= quantity <= 1000:
            raise ValueError("Quantity must be an integer from 1 to 1000")
        if self.booked + quantity > self.capacity:
            raise SoldOut("Insufficient seats")
        return SeatPool(self.capacity, self.booked + quantity)


@dataclass(frozen=True)
class Availability:
    title: str
    remaining: int
    status: str
    version: int


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value):
        raise ValueError("Invalid show ID")
    return value


def open_write(path):
    db = sqlite3.connect(path, isolation_level=None, timeout=5)
    try:
        db.execute("""CREATE TABLE IF NOT EXISTS shows (
            show_id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL,
            capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 1000),
            booked INTEGER NOT NULL CHECK (booked BETWEEN 0 AND capacity),
            version INTEGER NOT NULL CHECK (version >= 0)
        )""")
    except BaseException:
        db.close()
        raise
    return db


def open_read(path):
    return sqlite3.connect(Path(path).resolve().as_uri() + "?mode=ro",
                           uri=True, isolation_level=None)


def book_seats(db, show_id, quantity):
    show_id = identifier(show_id)
    db.execute("BEGIN IMMEDIATE")
    with db:
        row = db.execute("SELECT capacity, booked FROM shows WHERE show_id=?",
                         (show_id,)).fetchone()
        if row is None:
            raise LookupError("Unknown show")
        changed = SeatPool(*row).after_booking(quantity)
        db.execute("UPDATE shows SET booked=?, version=version+1 WHERE show_id=?",
                   (changed.booked, show_id))


def availability(db, show_id):
    row = db.execute("""SELECT title, capacity-booked,
        CASE WHEN booked=capacity THEN 'sold out' ELSE 'available' END,
        version FROM shows WHERE show_id=?""", (identifier(show_id),)).fetchone()
    if row is None:
        raise LookupError("Unknown show")
    return Availability(*row)
```

`demo.py` retains an old answer while another booking changes the authoritative state:

```python
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
from cqrs import open_write, open_read, book_seats, availability, SoldOut


with TemporaryDirectory() as directory:
    path = Path(directory) / "shows.sqlite"
    with closing(open_write(path)) as writer, closing(open_read(path)) as reader:
        writer.execute("INSERT INTO shows VALUES (?, ?, ?, ?, ?)",
                       ("SHOW-7", "Evening show", 2, 0, 0))
        old = availability(reader, "SHOW-7")
        print("before:", old.remaining, old.status, old.version)
        book_seats(writer, "SHOW-7", 2)
        print("kept DTO:", old.remaining, old.version)
        try:
            book_seats(writer, "SHOW-7", 1)
        except SoldOut as error:
            print("rejected:", error)
        fresh = availability(reader, "SHOW-7")
        print("fresh:", fresh.remaining, fresh.status, fresh.version)
```

The outputs are `before: 2 available 0`, `kept DTO: 2 0`, `rejected: Insufficient seats`, and `fresh: 0 sold out 1`. The rejected command leaves booking state and version unchanged. Queries are fresh statements against shared storage, not delayed projections. Previously returned DTOs remain snapshots.

The command returns normally only after commit and returns no query DTO. The stored version is observational, not an expected-version check. Repeated successful commands are not deduplicated: production retry handling needs operation identity. This example has no individual booking records, payment, authentication, event log, projection worker, or cancellation lifecycle.

## When to use it

Use CQRS where business changes require a behavioral model but consumers need substantially different query representations, or where the two sides justify different optimization strategies. It can fit one bounded part of a larger application.

If straightforward CRUD and ordinary query methods remain clear, retain them. CQRS is not a necessary step toward maturity, and read-heavy traffic alone may be solved with simpler indexes or caching.

## Tradeoffs and common mistakes

Two models need coordinated meaning, tests, and evolution. Separate stores add propagation, lag monitoring, recovery, and operational costs. Do not introduce eventual consistency just to resemble a diagram.

Moving queries out of a domain model does not justify duplicating its authoritative validation in a display DTO. An available badge cannot reserve a seat. Conversely, loading the full write model for every card can retain the coupling CQRS was meant to remove. Apply the separation only where these competing needs make its maintenance cost worthwhile.

## Related patterns

- [[domain-model|Domain Model]] organizes authoritative business behavior. CQRS lets that model focus on changes while queries use another representation.
- [[data-materialized-views|Materialized Views]] precomputes read results. CQRS can use them, but this example derives its DTO without stored read-side data.
- [[database-per-service|Database per Service]] separates ownership between services. CQRS separates model responsibilities and can remain inside one owner and one store.
- [[data-transactional-outbox|Transactional Outbox]] helps propagate committed changes when an asynchronous read model is chosen. It supplies neither CQRS nor complete projection correctness on its own.

## Sources

- [Greg Young: CQRS Documents](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf), especially printed pages 17–23, explains the origins, thin read layer, and behavioral command side.
- Fowler: [CQRS](https://martinfowler.com/bliki/CQRS.html) distinguishes models, deployment choices, and applicability; [Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html) explains the method-level principle.
- [Microsoft: CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) documents shared-store and separate-store approaches and optional Event Sourcing.
- [SQLite: Transactions](https://www.sqlite.org/lang_transaction.html) and [Python: sqlite3](https://docs.python.org/3/library/sqlite3.html) support the example's transaction, read-only connection, and resource rules.

The seat-booking fixtures, consistency scenario, code, and illustrations are original teaching material.
