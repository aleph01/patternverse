---
id: unit-of-work
type: pattern
title: Unit of Work
summary: Track the objects affected by a business operation and coordinate their persistence changes within one explicit completion boundary.
status: published
aliases:
  - Unit of Work Pattern
  - UoW
verses:
  - software-engineering
tags:
  - persistence
  - change-tracking
  - transaction-boundaries
attribution: "Unit of Work as described by Martin Fowler in Patterns of Enterprise Application Architecture, with supporting guidance from Harry Percival and Bob Gregory and official SQLAlchemy, SQLite, and Python documentation. Original Patternverse label-maintenance example, code, and native illustrations."
---

## Purpose and problem

A warehouse maintenance operation renames label A, adds label B, and retires label C. Three helpers each save independently. If the insertion fails after the rename commits, the database contains only part of the intended operation.

Wrapping statements in a transaction helps, but the application must also know which objects changed and ensure every writer participates. Scattered save calls can miss an object or commit too early. The operation needs one owner for its pending persistence work.

## Core idea

A **Unit of Work** tracks objects affected during a business operation and coordinates writing their changes. It commonly distinguishes new, modified, and removed objects, then arranges the necessary inserts, updates, and deletes at a deliberate boundary.

The mental model is **collect the changes; complete the operation together**. [Fowler's catalog](https://martinfowler.com/eaaCatalog/unitOfWork.html) establishes change tracking and coordinated persistence, including concurrency concerns. Unit of Work Pattern and UoW refer to the same pattern here. This is more specific than a generic task or arbitrary batch of jobs.

A database transaction supplies atomicity for participating database changes. The Unit of Work organizes the application's pending work and transaction policy; its name alone supplies no database guarantee.

![One maintenance operation registers label A as modified, B as new, and C as removed. The Unit of Work tracks those object snapshots, then translates them into UPDATE, INSERT, and DELETE operations under one database transaction. No registration writes SQL by itself.](../assets/software-engineering/unit-of-work-tracking.svg "Tracking and persistence are separate phases. The coordinator knows which objects need writing; the database supplies the local transaction mechanism.")

## How it works

### Track changes within a defined scope

Tracking can be explicit registration, intercepted mutations, or comparison with original snapshots. [SQLAlchemy's Session documentation](https://docs.sqlalchemy.org/en/20/orm/session_basics.html) describes instrumented objects and pending changes. The example below uses explicit immutable snapshots, making the registry visible without an ORM.

Define identity and repeated-change behavior. This teaching implementation accepts one final intent per ID. Registering the same ID twice rejects; it does not implement an ORM's transition rules for “new, then modified” or “new, then removed.” Registrations themselves perform no I/O.

### Coordinate writes and completion

Flushing translates pending changes into database statements. Committing makes a transaction's changes durable. They are distinct events even when one method performs both. Frameworks may flush before queries, so “SQL has run” does not necessarily mean “the operation committed.”

The example's explicit `commit` performs both phases. Leaving its context without calling commit discards the pending registry. Percival and Gregory's [Unit of Work chapter](https://www.cosmicpython.com/book/chapter_06_uow.html) explains an explicit-commit approach with safe cleanup. An in-scope commit attempt or scope exit finishes this single-use instance; it cannot silently start a second transaction.

The caller owns the connection and closing it. This Unit of Work requires an idle connection configured for explicit SQL transactions. It owns only the transaction it starts and must not roll back a caller's existing transaction.

### Choose ordering and concurrency policy

These independent label rows are written in update, insert, delete order, with IDs sorted within each group. Related rows may require different dependency ordering. Grouping changes does not guarantee one bulk SQL statement.

[SQLite](https://sqlite.org/lang_transaction.html) permits one writer at a time; this example uses `BEGIN IMMEDIATE` when committing. Contention can fail before any write. That lock does not validate snapshots collected earlier: stale proposals can still overwrite newer values. Version checks or a suitable locking/isolation protocol are additional choices; [SQLAlchemy's version-counter documentation](https://docs.sqlalchemy.org/en/20/orm/versioning.html) illustrates one mechanism.

![The Unit of Work updates A, then attempts to insert duplicate B. The insert fails, so the transaction rolls back the earlier update. A retains its committed value, and the failed Unit of Work is discarded. A successful batch can commit all three kinds of change together.](../assets/software-engineering/unit-of-work-failure.svg "A later write failure must undo earlier writes in the same operation. Retry decisions require a fresh scope and fresh inputs.")

## Worked example

### Collect three kinds of change before writing

One maintenance operation renames A, adds B, and removes C. The three `register_*` calls below record intentions without writing SQL. `work.commit()` then applies them within one database transaction. If adding B fails, the earlier update to A rolls back too.

Start with the application calls in `demo.py`, then follow `_changes`, `_register`, and `commit` in `uow.py`. The other checks enforce input validity and a single-use lifecycle.

Previously, each helper committed its own work. Here, registrations collect objects and one coordinator writes them. Save these two files together and run `python3 demo.py` with Python 3.10+ and standard-library SQLite.

IDs are exact nonblank ASCII text. Label text is 1–40 printable characters and not entirely whitespace. The table has independent rows with no foreign keys. Missing update/delete IDs reject; duplicate inserts propagate. The implementation deliberately exposes manual tracking rather than automatic dirty detection.

**demo.py — explicit success, omission, and failure**

```python
import sqlite3
from contextlib import closing
from uow import Label, UnitOfWork


with closing(sqlite3.connect(":memory:", isolation_level=None)) as db:
    db.execute("CREATE TABLE labels (id TEXT PRIMARY KEY, text TEXT NOT NULL)")
    db.executemany(
        "INSERT INTO labels VALUES (?, ?)",
        [("A", "Original"), ("C", "Obsolete")],
    )
    with UnitOfWork(db) as work:
        work.register_dirty(Label("A", "Ready"))
        work.register_new(Label("B", "New"))
        work.register_deleted(Label("C", "Obsolete"))
        print(
            "before commit:",
            db.execute("SELECT text FROM labels WHERE id = 'A'").fetchone()[0],
        )
        work.commit()
    print("committed:", db.execute("SELECT * FROM labels ORDER BY id").fetchall())
    with UnitOfWork(db) as work:
        work.register_dirty(Label("A", "Draft"))
    print(
        "without commit:",
        db.execute("SELECT text FROM labels WHERE id = 'A'").fetchone()[0],
    )
    try:
        with UnitOfWork(db) as work:
            work.register_dirty(Label("A", "Wrong"))
            work.register_new(Label("B", "Duplicate"))
            work.commit()
    except sqlite3.IntegrityError:
        print("failed batch: rolled back")
    print("after failure:", db.execute("SELECT * FROM labels ORDER BY id").fetchall())
# before commit: Original
# committed: [('A', 'Ready'), ('B', 'New')]
# without commit: Ready
# failed batch: rolled back
# after failure: [('A', 'Ready'), ('B', 'New')]
```

**uow.py — snapshots, explicit registration, and coordinated persistence**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Label:
    label_id: str
    text: str

    def __post_init__(self):
        if (
            type(self.label_id) is not str
            or not self.label_id.strip()
            or not self.label_id.isascii()
        ):
            raise ValueError("Nonblank ASCII ID required")
        if (
            type(self.text) is not str
            or not self.text.strip()
            or not self.text.isprintable()
            or len(self.text) > 40
        ):
            raise ValueError("Use 1–40 printable label characters")


class UnitOfWork:
    def __init__(self, db):
        self._db, self._changes = db, {}
        self._entered = self._closed = False

    def __enter__(self):
        if self._entered or self._closed:
            raise RuntimeError("Single-use scope")
        self._entered = True
        return self

    def __exit__(self, *error):
        self._changes.clear()
        self._closed = True

    def _check(self):
        if not self._entered or self._closed:
            raise RuntimeError("Active scope required")

    def _register(self, kind, label):
        self._check()
        if type(label) is not Label:
            raise TypeError("Label required")
        if label.label_id in self._changes:
            raise ValueError("One final intent per ID")
        self._changes[label.label_id] = (kind, label)

    def register_new(self, label):
        self._register("new", label)

    def register_dirty(self, label):
        self._register("dirty", label)

    def register_deleted(self, label):
        self._register("deleted", label)

    def commit(self):
        self._check()
        owned = False
        try:
            if self._db.in_transaction or self._db.isolation_level is not None:
                raise RuntimeError("Idle explicit-transaction connection required")
            self._db.execute("BEGIN IMMEDIATE")
            owned = True
            for kind in ("dirty", "new", "deleted"):
                for key in sorted(self._changes):
                    action, label = self._changes[key]
                    if action != kind:
                        continue
                    if kind == "new":
                        self._db.execute(
                            "INSERT INTO labels (id, text) VALUES (?, ?)",
                            (key, label.text),
                        )
                    elif kind == "dirty":
                        cursor = self._db.execute(
                            "UPDATE labels SET text = ? WHERE id = ?",
                            (label.text, key),
                        )
                        if cursor.rowcount == 0:
                            raise LookupError("Label missing")
                    else:
                        cursor = self._db.execute(
                            "DELETE FROM labels WHERE id = ?", (key,)
                        )
                        if cursor.rowcount == 0:
                            raise LookupError("Label missing")
            self._db.execute("COMMIT")
        except BaseException:
            if owned and self._db.in_transaction:
                self._db.execute("ROLLBACK")
            raise
        finally:
            self._changes.clear()
            self._closed = True
```

The first batch updates, inserts, and deletes together. The second never writes. The third updates A provisionally, then duplicate B fails and rollback restores A. Python's [transaction-control documentation](https://docs.python.org/3/library/sqlite3.html#transaction-control-via-the-isolation-level-attribute) supports the explicit SQL configuration.

## When to use it

Use Unit of Work when one operation changes several objects, writers otherwise commit independently, or tracking pending changes belongs in one testable place.

For a single straightforward update, a database transaction block may suffice. An ORM may already provide this responsibility; avoid a second independent tracker around it.

## Tradeoffs and common mistakes

**Leaking the scope.** Keep one instance local to one operation, not shared across concurrent requests or tasks.

**Incomplete tracking.** Explicit registration can omit changes; automatic tracking brings its own instrumentation and lifecycle complexity.

**Overstating rollback.** Database rollback does not rewind arbitrary objects. Commit only after the operation succeeds; an exception after commit cannot undo it.

**Crossing resource boundaries.** One local transaction does not include another database, an email, or an HTTP call. Those effects need separate coordination and delivery policies.

## Related patterns

[[repository|Repository]] supplies domain-oriented access. Repositories participating in one Unit of Work must share its transaction policy.

[[data-mapper|Data Mapper]] translates objects and rows; a Unit of Work can delegate its scheduled writes to mappers.

[[service-layer|Service Layer]] defines the application operation and chooses when its Unit of Work completes.

[[active-record|Active Record]] lets records persist themselves. Several records can still participate in one coordinated transaction if individual saves do not commit independently.

## Sources

Fowler's [Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html), in *Patterns of Enterprise Application Architecture*, establishes the pattern. Percival and Gregory, SQLAlchemy, SQLite, and Python documentation linked above support the tracking, transaction, lifecycle, and concurrency distinctions.

The label scenario, explicit tracker, code, and illustrations are original teaching material.
