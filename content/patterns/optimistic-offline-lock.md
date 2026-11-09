---
id: optimistic-offline-lock
type: pattern
title: Optimistic Offline Lock
summary: Retain the version read at the start of an edit, and accept its final write only if that version still matches in an atomic save transaction.
status: published
aliases:
  - Optimistic Offline Locking
verses:
  - software-engineering
tags:
  - persistence
  - concurrency-control
  - version-checks
attribution: "Optimistic Offline Lock by David Rice in Martin Fowler's Patterns of Enterprise Application Architecture, with supporting Microsoft, SQLAlchemy, SQLite, Python, and HTTP standards documentation. Original Patternverse note-editing example, code, and native illustrations."
---

## Purpose and problem

Alice and Bob open the same planning note. Alice saves a revised title. Bob, still viewing the original, saves his own title a minute later. A normal update by ID silently overwrites Alice's work.

Keeping a database transaction open while somebody thinks, switches tabs, or leaves for lunch is an expensive way to prevent this. Yet ending the read transaction means its protection cannot extend over the whole edit. The application needs to detect that the assumptions behind a later save have changed.

## Core idea

**Optimistic Offline Lock** lets edits proceed independently, then validates the original state when saving. A common implementation carries a version token with the loaded record. The write succeeds only while the stored token matches, and advances that token atomically with the change.

The mental model is **save against the version you actually read**. David Rice's [catalog entry](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html), in Fowler's *Patterns of Enterprise Application Architecture*, describes validation and updates within one system transaction. “Offline” means the business operation spans system transactions; disconnected networking is not required. Optimistic locking and optimistic concurrency control are broader terms, not exact synonyms for this lifetime.

![Alice and Bob both read note version 1 and edit outside database transactions. Alice's conditional save matches version 1, writes her title, and commits version 2. Bob's later save still expects version 1, matches no row, and is rejected without overwriting Alice.](../assets/software-engineering/optimistic-offline-lock-conflict.svg "The comparison and version advance belong to the same write. Two independent reads are allowed; the later stale save is rejected.")

## How it works

### Carry the original token across the edit

Load the record and its token together. Preserve that token with the user's proposed change rather than fetching the newest token immediately before saving. Replacing it mechanically would turn the conflict check into permission to overwrite.

Every relevant writer must advance the token, including imports, maintenance scripts, and child updates covered by a parent version. Do not reuse tokens when resetting data or recycling IDs: an old edit might then appear current. The example uses a positive integer counter, with explicit bounds rather than wraparound.

### Compare and write atomically

The save issues an update with both ID and expected version in its predicate. [SQLAlchemy's version-counter documentation](https://docs.sqlalchemy.org/en/20/orm/versioning.html) shows this shape and checks for exactly one affected row. A separate SELECT comparison followed by an unconditional UPDATE leaves a race between them.

Zero affected rows means the record changed or disappeared; this implementation reports one conflict without pretending to distinguish those causes. The version is a token, not a time or elapsed duration. The short transaction also includes an edit-log insertion. Any later failure must roll back the title, version, and log together.

### Treat conflict as a business decision

After conflict, reload and review the proposed operation against current data. [Microsoft's concurrency guidance](https://learn.microsoft.com/en-us/ef/core/saving/concurrency) distinguishes original, proposed, and stored values when resolving conflicts. A user may merge, abandon, or deliberately replace a value. Blindly attaching the newest version to the old replacement loses that distinction.

Optimistic does not mean the database takes no locks during writes. [SQLite permits one writer at a time](https://www.sqlite.org/lang_transaction.html); the example starts a short `BEGIN IMMEDIATE` only for saving. Busy/connection errors are storage failures, not stale-version conflicts. No database transaction remains open during the simulated editing interval.

![A short save transaction conditionally changes the note and advances its version, then inserts the edit-log row. Both commit together. A stale version or later log failure rolls the transaction back. After conflict, the application reloads and reviews before making a new proposal; it does not blindly retry the old replacement.](../assets/software-engineering/optimistic-offline-lock-save.svg "A matching version permits a provisional write, not an early success response. Report success only after the whole save transaction commits.")

## Worked example

### Two connections, two snapshots, one accepted first save

Previously, either editor could update by ID alone. Here, immutable Note snapshots retain their original versions. Save these files together and run `python3 demo.py` with Python 3.10+ and standard-library SQLite.

IDs and versions are positive signed 64-bit integers. Titles contain 1–80 printable characters and cannot be entirely whitespace. Saving the maximum version rejects instead of wrapping. The caller owns connection closing; `save` requires an idle connection configured for explicit SQL transactions and owns the short transaction it starts.

**notes.py — an atomic conditional save with a local edit log**

```python
from dataclasses import dataclass


class Conflict(Exception):
    pass


def positive(value):
    if type(value) is not int or not 1 <= value <= 2**63 - 1:
        raise ValueError("Positive signed 64-bit integer required")


@dataclass(frozen=True)
class Note:
    note_id: int
    title: str
    version: int

    def __post_init__(self):
        positive(self.note_id)
        positive(self.version)
        if type(self.title) is not str or not self.title.strip() or not self.title.isprintable() or len(self.title) > 80:
            raise ValueError("Use 1–80 printable title characters")


def load(db, note_id):
    positive(note_id)
    row = db.execute("SELECT id, title, version FROM notes WHERE id = ?", (note_id,)).fetchone()
    return Note(*row) if row is not None else None


def save(db, original, title):
    if type(original) is not Note:
        raise TypeError("Note snapshot required")
    candidate = Note(original.note_id, title, original.version + 1)
    if db.in_transaction or db.isolation_level is not None:
        raise RuntimeError("Idle explicit-transaction connection required")
    db.execute("BEGIN IMMEDIATE")
    try:
        changed = db.execute(
            "UPDATE notes SET title = ?, version = ? WHERE id = ? AND version = ?",
            (candidate.title, candidate.version, original.note_id, original.version),
        )
        if changed.rowcount != 1:
            raise Conflict("Note changed or deleted")
        db.execute("INSERT INTO edits VALUES (?, ?, ?)", (candidate.note_id, candidate.version, candidate.title))
        db.execute("COMMIT")
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise
    return candidate
```

**demo.py — conflict, reload, and an explicitly reviewed proposal**

```python
import sqlite3
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
from notes import Conflict, load, save


with TemporaryDirectory() as directory:
    path = str(Path(directory) / "notes.sqlite")
    with closing(sqlite3.connect(path, isolation_level=None)) as alice, closing(sqlite3.connect(path, isolation_level=None)) as bob:
        alice.execute("CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, version INTEGER NOT NULL)")
        alice.execute("CREATE TABLE edits (note_id INTEGER, version INTEGER, title TEXT, UNIQUE(note_id, version))")
        alice.execute("INSERT INTO notes VALUES (1, 'Draft', 1)")
        first, second = load(alice, 1), load(bob, 1)
        print("read versions:", first.version, second.version)
        print("alice saved:", save(alice, first, "Launch plan").version)
        try:
            save(bob, second, "Budget plan")
        except Conflict:
            print("bob: reload and review")
        current = load(bob, 1)
        print("stored:", current.title, current.version)
        reviewed = save(bob, current, "Launch plan / budget reviewed")
        print("reviewed save:", reviewed.version)
        print("edit-log rows:", bob.execute("SELECT COUNT(*) FROM edits").fetchone()[0])
# read versions: 1 1
# alice saved: 2
# bob: reload and review
# stored: Launch plan 2
# reviewed save: 3
# edit-log rows: 2
```

The interleaving is deliberate and repeatable, not a timing benchmark. Python documents the [affected-row count](https://docs.python.org/3/library/sqlite3.html#sqlite3.Cursor.rowcount) used by the conditional write. Only committed saves return a new snapshot; the stale input remains version 1.

### The same boundary over HTTP

An edit API can carry a representation's strong ETag into `If-Match`. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match) defines strong comparison and rejection of a false precondition, commonly with 412. The server must still implement the conditional change atomically; a header alone supplies no storage coordination. No HTTP server is included here.

## When to use it

Use this pattern for overlapping forms or workflows when conflicts are uncommon and can be resolved explicitly. It avoids reserving data throughout a long edit.

For one short operation, an appropriate database transaction may suffice. If costly edits frequently collide, reserving ownership earlier may be preferable.

## Tradeoffs and common mistakes

**Guarding too little.** A row token does not validate assumptions about other rows or prevent write skew. Choose a shared aggregate guard or another transaction/isolation protocol for those invariants.

**Bypassing the protocol.** An unconditional writer or reset version can defeat detection. A same-title save still advances this example's counter and may cause a conservative conflict.

**Confusing conflict with retry safety.** External email or payment effects do not roll back with this transaction. Unknown commit outcomes need reconciliation or idempotency; this example does not implement them. Tokens also grant no authorization.

## Related patterns

[[pessimistic-offline-lock|Pessimistic Offline Lock]] reserves ownership before editing; Optimistic Offline Lock allows parallel work and checks at completion.

[[unit-of-work|Unit of Work]] coordinates a set of persistence changes; version validation can be part of its completion transaction.

[[aggregate|Aggregate]] defines an invariant boundary. A root version covers children only when every relevant child-writing path participates.

[[identity-map|Identity Map]] avoids duplicate local objects; it cannot detect a newer version held by another process.

## Sources

David Rice's [Optimistic Offline Lock](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html), in Fowler's *Patterns of Enterprise Application Architecture*, establishes the pattern. Microsoft, SQLAlchemy, SQLite, Python, and RFC 9110 links above support conflict handling, conditional writes, transaction behavior, and HTTP preconditions.

The note scenario, local edit log, implementation, and illustrations are original teaching material.
