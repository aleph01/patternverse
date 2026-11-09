---
id: repository
type: pattern
title: Repository
summary: Expose a domain-oriented collection of objects while keeping storage queries and mapping details behind a deliberate access contract.
status: published
aliases:
  - Repository Pattern
  - Domain Repository
verses:
  - software-engineering
tags:
  - persistence
  - domain-object-access
  - storage-boundaries
attribution: "Repository as described by Edward Hieatt and Rob Mee in Patterns of Enterprise Application Architecture, with Eric Evans's DDD guidance and Harry Percival and Bob Gregory's Python treatment. Original Patternverse workshop example, code, and native illustrations."
---

## Purpose and problem

A workshop application needs sessions with enough available seats. Its booking screen builds an SQL query; an import tool reconstructs the same objects from rows; tests imitate database cursors. A column rename reaches one caller but misses another. Business code increasingly understands storage rather than workshops.

The application needs objects and meaningful selection operations. Storage still needs queries, mapping, and failure handling. Those responsibilities should cooperate through an explicit boundary.

## Core idea

A **Repository** presents access to domain objects through a collection-like interface. Clients request objects by identity, add objects, or ask for a meaningful selection. The implementation handles the storage work behind those operations.

The mental model is **ask for domain objects; keep storage machinery behind the collection**. The [catalog entry by Edward Hieatt and Rob Mee](https://martinfowler.com/eaaCatalog/repository.html) establishes this mediation between domain and mapping layers. Repository Pattern and Domain Repository name this role here; it is unrelated to a source-code repository or package registry.

Collection-like describes the interface, not a guarantee that everything is in memory. A call may perform I/O, fail, or observe stale state. A repository need not offer every possible collection operation.

![Application code asks the Workshops repository for workshops with room for two attendees. Either the memory implementation filters stored Workshop objects or the SQLite implementation queries rows and constructs Workshop objects. The caller receives the same ordered domain-level result without seeing SQL or cursors.](../assets/software-engineering/repository-boundary.svg "One domain-facing contract, two storage implementations. Storage queries and object reconstruction remain behind the boundary.")

## How it works

### Design the contract around the model

Choose operations that callers actually need. This example offers `add`, `get`, and `with_room_for`. The selection returns workshops, not tuples of database columns or an ORM query builder. [Percival and Gregory](https://www.cosmicpython.com/book/chapter_02_repository.html) demonstrate a small repository abstraction and explain why Python can use duck typing instead of mandatory interface inheritance.

In DDD, [Evans's Repositories guidance](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) places direct access at aggregate roots that need it. A repository per database table can expose children independently and bypass the aggregate's rules. Reporting projections may instead use a separate query path without reconstructing whole aggregates.

### Specify results and persistence semantics

Decide what an unknown identity returns, how duplicates behave, and whether ordering is promised. Specify whether fetched objects are live tracked instances or detached snapshots. Here, a missing ID returns `None`, duplicate adds raise `ValueError`, and selections are ordered by exact ID. Other storage errors propagate.

These workshops are immutable snapshots. Repeated retrieval does not promise Python object identity, and mutation is not an implicit persistence mechanism. The example supports adding new workshops and reading them; updating or removing them would require an additional contract.

A [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html) transfers between storage and object representations. A repository supplies the domain-facing access abstraction; an implementation may use an ORM mapper or small explicit mapping code.

### Keep transaction and resource ownership explicit

The SQLite implementation neither commits nor closes its connection. The caller owns both. Several repository operations can therefore participate in one surrounding transaction. A larger application can give that coordination to a Unit of Work.

The memory implementation is useful for contract tests, but supplies no rollback, durability, database constraints, or concurrency model. Matching query results does not make it a substitute for storage integration tests.

Reading sufficient seats does not reserve them. A booking operation must recheck and change availability under its chosen concurrency protection. Repository supplies no authorization, locking, freshness, or cross-store atomicity merely by existing.

![A repository returns workshop A with two seats left. Another booking then commits one remaining seat. The caller still holds its immutable two-seat snapshot; a new repository read can obtain the updated state. Neither the selection nor the old snapshot reserves seats; booking needs its own concurrency protection.](../assets/software-engineering/repository-snapshots.svg "A repository controls access, not the passage of time. Read consistency depends on the backing store and surrounding transaction; an old result is not a booking guarantee.")

## Worked example

### Keep the caller independent of row layout

The caller below is the part that stays unchanged. `candidates(repo)` adds workshops B, A, and C with three, two, and zero seats, then asks `repo.with_room_for(2)` for suitable workshops. Both implementations return A before B. The caller names a domain query without selecting columns or reconstructing rows.

Read `demo.py` first, then compare how the memory and SQLite implementations fulfill that same contract.

Before the change, callers selected columns and reconstructed workshops themselves. Now `candidates` uses the same repository operations with either implementation. Save these three files together and run `python3 demo.py` with Python 3.10+ and SQLite 3.24+.

Counts are whole seats. IDs are nonblank ASCII text with case and whitespace preserved. The named query is deliberately bounded; it is not a translator for arbitrary Python predicates.

**demo.py — one caller, two implementations**

```python
import sqlite3
from contextlib import closing
from model import Workshop
from repositories import MemoryWorkshops, SqliteWorkshops


def candidates(repo):
    for workshop in (Workshop("B", 3), Workshop("A", 2), Workshop("C", 0)):
        repo.add(workshop)
    return tuple(w.workshop_id for w in repo.with_room_for(2))


print("memory:", candidates(MemoryWorkshops()))
with closing(sqlite3.connect(":memory:")) as db:
    db.execute("CREATE TABLE workshops (id TEXT PRIMARY KEY, seats_left INTEGER NOT NULL CHECK(seats_left >= 0))")
    repo = SqliteWorkshops(db)
    with db:
        selected = candidates(repo)
    print("sqlite:", selected)
    print("missing:", repo.get("unknown"))
    print("A fits four:", repo.get("A").can_book(4))
    try:
        with db:
            repo.add(Workshop("A", 9))
    except ValueError as error:
        print("duplicate:", error)
# memory: ('A', 'B')
# sqlite: ('A', 'B')
# missing: None
# A fits four: False
# duplicate: Workshop exists
```

**model.py — a domain object without storage dependencies**

```python
from dataclasses import dataclass


def require_id(value):
    if type(value) is not str or not value.strip() or not value.isascii():
        raise ValueError("Nonblank ASCII ID required")


def positive_count(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Positive whole seat count required")


@dataclass(frozen=True)
class Workshop:
    workshop_id: str
    seats_left: int

    def __post_init__(self):
        require_id(self.workshop_id)
        if type(self.seats_left) is not int or self.seats_left < 0:
            raise ValueError("Invalid availability")

    def can_book(self, seats):
        positive_count(seats)
        return seats <= self.seats_left
```

**repositories.py — matching access semantics, different storage**

```python
from model import Workshop, positive_count, require_id


def require_workshop(value):
    if type(value) is not Workshop:
        raise TypeError("Workshop required")


class MemoryWorkshops:
    def __init__(self):
        self._items = {}

    def add(self, workshop):
        require_workshop(workshop)
        if workshop.workshop_id in self._items:
            raise ValueError("Workshop exists")
        self._items[workshop.workshop_id] = workshop

    def get(self, workshop_id):
        require_id(workshop_id)
        return self._items.get(workshop_id)

    def with_room_for(self, seats):
        positive_count(seats)
        return tuple(w for key, w in sorted(self._items.items()) if w.can_book(seats))


class SqliteWorkshops:
    def __init__(self, db):
        self.db = db

    def add(self, workshop):
        require_workshop(workshop)
        cursor = self.db.execute(
            "INSERT INTO workshops VALUES (?, ?) ON CONFLICT(id) DO NOTHING",
            (workshop.workshop_id, workshop.seats_left),
        )
        if cursor.rowcount == 0:
            raise ValueError("Workshop exists")

    def get(self, workshop_id):
        require_id(workshop_id)
        row = self.db.execute(
            "SELECT id, seats_left FROM workshops WHERE id = ?", (workshop_id,)
        ).fetchone()
        return None if row is None else Workshop(*row)

    def with_room_for(self, seats):
        positive_count(seats)
        rows = self.db.execute(
            "SELECT id, seats_left FROM workshops WHERE seats_left >= ? ORDER BY id",
            (seats,),
        ).fetchall()
        return tuple(Workshop(*row) for row in rows)
```

A qualifies at the exact two-seat boundary; C does not. Both implementations return A before B despite insertion order. The duplicate leaves A's two seats unchanged. [SQLite's targeted conflict clause](https://sqlite.org/lang_upsert.html) handles duplicate IDs without hiding unrelated constraint failures. Python's [connection context manager](https://docs.python.org/3/library/sqlite3.html#how-to-use-the-connection-context-manager) supplies the caller's commit or rollback; `closing` owns connection cleanup.

## When to use it

Use Repository when domain code repeatedly constructs storage queries, row mapping spreads across callers, or a focused access contract would make business tests clearer. The abstraction should hide decisions that otherwise leak.

A simple record-entry application may be clearer using its ORM directly. An ORM may already supply enough collection and mapping behavior; another forwarding wrapper must earn its cost.

## Tradeoffs and common mistakes

**A universal CRUD wrapper.** Generic operations for every table can erase domain meaning while preserving storage coupling.

**An unbounded collection illusion.** Loading everything before filtering can exhaust memory or create excessive queries. Add explicit pagination and useful storage-side selection when required.

**A misleading test double.** Match missing-value, duplicate, filtering, and ordering semantics, then test real persistence separately. Memory behavior cannot establish transaction guarantees.

**An accidental security boundary.** Tenant scoping and authorization need explicit enforcement. Hiding SQL does not make an unrestricted lookup safe.

## Related patterns

[[domain-model|Domain Model]] owns business behavior; Repository retrieves and stores its objects without moving their rules into SQL callers.

[[aggregate|Aggregate]] defines a consistency boundary. DDD repositories normally retrieve roots through which that boundary is respected.

[[service-layer|Service Layer]] coordinates a use case, including repository access and the surrounding transaction policy.

[[specification|Specification]] can describe selection criteria. A repository may interpret a supported specification, but arbitrary in-memory predicates do not automatically become equivalent database queries.

## Sources

Hieatt and Mee's [Repository](https://martinfowler.com/eaaCatalog/repository.html), in *Patterns of Enterprise Application Architecture*, establishes the collection-like abstraction. Evans's [DDD Reference, Repositories, printed page 17](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) covers aggregate-root access. Percival and Gregory, Data Mapper, SQLite, and Python sources linked above support implementation choices and limits.

The workshop contract, code, and illustrations are original teaching material.
