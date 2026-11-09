---
id: pessimistic-offline-lock
type: pattern
title: Pessimistic Offline Lock
summary: Reserve write ownership before a long edit, retain that logical lock across requests, and validate ownership when saving or releasing it.
status: published
aliases:
  - Pessimistic Offline Locking
verses:
  - software-engineering
tags:
  - persistence
  - concurrency-control
  - ownership
attribution: "Pessimistic Offline Lock by David Rice in Martin Fowler's Patterns of Enterprise Application Architecture, with supporting PostgreSQL, SQLite, and Python documentation. Original Patternverse note-checkout example, code, and native illustrations."
---

## Purpose and problem

An editor spends twenty minutes revising a planning note, then discovers that somebody else saved it first. A conflict detector protects the stored note, but the editor must now reconcile a substantial amount of work. This happens often enough that waiting to detect conflicts at save time is frustrating.

Holding a database transaction open for the entire edit ties resource ownership to unpredictable human time. The application instead needs to reserve the right to edit across several requests, while keeping its individual database transactions short.

## Core idea

**Pessimistic Offline Lock** acquires logical ownership before work begins. Other participating operations must respect that reservation until its owner completes or cancels the work.

The mental model is **reserve first; edit; save or release**. David Rice's [catalog entry](https://martinfowler.com/eaaCatalog/pessimisticOfflineLock.html), in Fowler's *Patterns of Enterprise Application Architecture*, describes the pattern for business operations spanning multiple requests. “Offline” does not require a disconnected device. Pessimistic locking is a broader term; a database row lock held within one transaction is not this complete lifecycle.

The example reserves exclusive **write** ownership of one note. Other readers may still see its committed state. It prevents competing edits only among writers that follow the same protocol; it does not guarantee that an edit can never fail.

![A short acquisition transaction stores Alice's unique owner token and commits. Alice edits with no database transaction held open. Bob's competing acquisition is refused while that lock row exists. Alice later saves under an ownership check and removes the lock in one short transaction.](../assets/software-engineering/pessimistic-offline-lock-reservation.svg "The committed lock row outlives each database transaction. The reservation controls participating writers, not ordinary read-only access.")

## How it works

### Make acquisition an atomic decision

A shared lock manager records the protected identity and its current owner. A unique key on the resource prevents two successful owners. Checking “is it free?” and inserting later is insufficient; acquisition must resolve the competition atomically.

Here, a SQLite lock table uses the note ID as its primary key. An [INSERT with a targeted conflict clause](https://www.sqlite.org/lang_upsert.html) either acquires the row or reports it already held. The operation also reads the title before committing, so the returned edit starts from the protected state.

### Separate logical ownership from database locks

Each acquire, save, and cancel uses a short local transaction. [SQLite permits only one writer at a time](https://www.sqlite.org/lang_transaction.html); these physical write transactions serialize operations on the tables. The durable lock row supplies the longer reservation between calls.

Database locks have different lifetimes. [PostgreSQL's locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html) describes transaction and session lock behavior; leaving a transaction or connection open during human editing is a different resource commitment. This example needs neither to preserve its logical reservation.

Each acquisition receives a fresh, opaque token. Saving checks the resource and token in the same transaction as the write and lock removal. Cancellation deletes only the matching ownership row. An old handle must not save through, or release, a later owner's reservation.

### Own the abandoned-lock policy

The example has no expiry. A crashed client can leave its committed reservation behind even after its connection closes. Recovery requires a trusted server process or administrator to revoke that ownership deliberately. Old handles then fail the ownership check.

A lease would require more policy: authoritative time, renewal, expiry, takeover, and late owners. Do not add a timer and assume stale work becomes harmless. Separate external resources may need fencing or their own checks; the token below is an ownership capability checked in this database, not a general distributed fencing protocol.

![After Alice's ownership ends, Bob acquires the note using a fresh token. A late save using Alice's old token matches no ownership row and is rejected. A late cancellation using that token cannot remove Bob's lock. Bob can still save or cancel his own reservation.](../assets/software-engineering/pessimistic-offline-lock-ownership.svg "Use a token per acquisition, not just a username or resource ID. Validate the current owner at the protected write and at release.")

## Worked example

### Check out one note across separate calls

Previously, overlapping editors worked until one lost at save time. Now the second acquisition reports busy before editing. Save these files together and run `python3 demo.py` with Python 3.10+ and SQLite 3.24+.

IDs are positive signed 64-bit integers. Titles contain 1–80 printable characters and cannot be entirely whitespace. Handles come from the trusted server's acquisition operation and are immutable. A token identifies one acquisition, not an authenticated user; authorization remains outside this example.

**checkout.py — committed ownership and guarded completion**

```python
from contextlib import contextmanager
from dataclasses import dataclass
from uuid import uuid4


class Busy(Exception):
    pass


class LostLock(Exception):
    pass


def valid_title(title):
    if type(title) is not str or not title.strip() or not title.isprintable() or len(title) > 80:
        raise ValueError("Use 1–80 printable title characters")


@dataclass(frozen=True)
class Handle:
    note_id: int
    token: str
    title: str


@contextmanager
def atomic(db):
    if db.in_transaction or db.isolation_level is not None:
        raise RuntimeError("Idle explicit-transaction connection required")
    db.execute("BEGIN IMMEDIATE")
    try:
        yield
        db.execute("COMMIT")
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise


def acquire(db, note_id):
    if type(note_id) is not int or not 1 <= note_id <= 2**63 - 1:
        raise ValueError("Positive signed 64-bit ID required")
    token = uuid4().hex
    with atomic(db):
        inserted = db.execute(
            "INSERT INTO locks VALUES (?, ?) ON CONFLICT(note_id) DO NOTHING", (note_id, token)
        )
        if inserted.rowcount != 1:
            raise Busy("Note already checked out")
        row = db.execute("SELECT title FROM notes WHERE id = ?", (note_id,)).fetchone()
        if row is None:
            raise LookupError("Note missing")
        valid_title(row[0])
    return Handle(note_id, token, row[0])


def save(db, handle, title):
    valid_title(title)
    with atomic(db):
        changed = db.execute(
            "UPDATE notes SET title = ? WHERE id = ? AND EXISTS "
            "(SELECT 1 FROM locks WHERE note_id = ? AND token = ?)",
            (title, handle.note_id, handle.note_id, handle.token),
        )
        if changed.rowcount != 1:
            raise LostLock("Ownership or note no longer present")
        db.execute("DELETE FROM locks WHERE note_id = ? AND token = ?", (handle.note_id, handle.token))


def cancel(db, handle):
    with atomic(db):
        removed = db.execute("DELETE FROM locks WHERE note_id = ? AND token = ?", (handle.note_id, handle.token))
    return removed.rowcount == 1
```

**demo.py — busy acquisition and a stale owner's rejected save**

```python
import sqlite3
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
from checkout import Busy, LostLock, acquire, cancel, save


with TemporaryDirectory() as directory:
    path = str(Path(directory) / "notes.sqlite")
    with closing(sqlite3.connect(path, isolation_level=None)) as alice, closing(sqlite3.connect(path, isolation_level=None)) as bob:
        alice.execute("CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL)")
        alice.execute("CREATE TABLE locks (note_id INTEGER PRIMARY KEY, token TEXT NOT NULL)")
        alice.execute("INSERT INTO notes VALUES (1, 'Draft')")
        first = acquire(alice, 1)
        print("alice acquired:", first.title)
        try:
            acquire(bob, 1)
        except Busy:
            print("bob: busy")
        print("transactions open:", alice.in_transaction, bob.in_transaction)
        save(alice, first, "Launch plan")
        second = acquire(bob, 1)
        try:
            save(alice, first, "Late overwrite")
        except LostLock:
            print("old handle: rejected")
        print("bob still owns:", bob.execute("SELECT token FROM locks WHERE note_id = 1").fetchone()[0] == second.token)
        print("bob cancel:", cancel(bob, second))
        print("stored:", bob.execute("SELECT title FROM notes WHERE id = 1").fetchone()[0])
# alice acquired: Draft
# bob: busy
# transactions open: False False
# old handle: rejected
# bob still owns: True
# bob cancel: True
# stored: Launch plan
```

Python's [SQLite documentation](https://docs.python.org/3/library/sqlite3.html#sqlite3.Cursor.rowcount) supports the affected-row checks. The caller owns connection closing. Busy acquisition, stale ownership, and storage failures remain distinct outcomes. An error before commit rolls back the title and release. An uncertain completion requires checking stored data and ownership before retrying.

## When to use it

Use this pattern when conflicts are frequent, editing is costly, and reserving a resource earlier is acceptable. It needs visible ownership and a recovery policy.

For rare conflicts, optimistic validation may offer better availability. For a brief operation, ordinary database transaction locking may suffice.

## Tradeoffs and common mistakes

**Abandoned ownership.** Reservations consume availability until released or recovered. This example supplies neither expiry nor a recovery interface.

**Inconsistent participation.** Direct SQL and other writers can bypass the protocol. Centralize protected writes and guard all members of the intended invariant boundary.

**Deadlock and starvation.** Multiple-resource workflows need consistent acquisition ordering and a policy for failed partial acquisition. This single-resource example has no queue or fairness guarantee.

## Related patterns

[[optimistic-offline-lock|Optimistic Offline Lock]] validates at completion instead of reserving before work. Both require coordinated writes and explicit failure handling.

[[unit-of-work|Unit of Work]] can coordinate protected writes and lock release in one completion transaction.

[[aggregate|Aggregate]] helps choose what a reservation protects; locking one row does not automatically guard a cross-record invariant.

[[repository|Repository]] can centralize participating access, but a repository name alone does not enforce ownership.

## Sources

David Rice's [Pessimistic Offline Lock](https://martinfowler.com/eaaCatalog/pessimisticOfflineLock.html), in Fowler's *Patterns of Enterprise Application Architecture*, establishes the pattern. PostgreSQL, SQLite, and Python sources linked above support the implementation distinctions. The [UUID documentation](https://docs.python.org/3/library/uuid.html#uuid.uuid4) supports the random acquisition identifier; it supplies no authentication or lease semantics.

The note-checkout scenario, token policy, code, and illustrations are original teaching material.
