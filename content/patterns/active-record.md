---
id: active-record
type: pattern
title: Active Record
summary: Put a row's data, domain behavior, and database access operations on the same object, giving callers a direct record-oriented API.
status: published
aliases:
  - Active Record Pattern
  - ActiveRecord
verses:
  - software-engineering
tags:
  - persistence
  - record-oriented-models
  - object-relational-mapping
attribution: "Active Record as described by Martin Fowler in Patterns of Enterprise Application Architecture. Rails documentation supplies concrete framework examples and qualifications. Original Patternverse Python task-record example and native illustrations."
---

## Purpose and problem

A small operations tool tracks tasks. Each task has a title and a completion flag. Screens repeatedly load a row, check its title, apply the rule that completed tasks cannot be renamed, and write it back. For this modest model, separate mapping and storage interfaces add more coordination than the rules need.

The application needs a compact place for the record's meaning and its persistence behavior. It should still make clear when an object changes, when SQL runs, and when a transaction actually commits.

## Core idea

An **Active Record** combines a database row's data, domain behavior, and persistence operations in one object. A caller can find a task, ask it to complete, and save it through the same record-oriented API.

The mental model is **the record knows its rules and how to persist itself**. [Fowler's catalog](https://martinfowler.com/eaaCatalog/activeRecord.html) establishes this responsibility choice. Active Record Pattern names the pattern; ActiveRecord is also the name of Rails's implementation, whose particular API is not a universal requirement.

[Rails's introduction](https://guides.rubyonrails.org/active_record_basics.html) provides a substantial framework example. The small Python implementation below makes the mechanism visible without a framework dependency. Constructors, generated IDs, save behavior, and transaction ownership are explicit implementation choices.

![A caller loads and works with a Task object. The Task contains its title and completion flag, rename and complete business operations, and find and save persistence methods. The same class issues SQL for the corresponding tasks row; no separate mapper is used.](../assets/software-engineering/active-record-responsibilities.svg "The record object owns both business behavior and persistence knowledge. Ordinary changes and SQL writes remain separate operations in this example.")

## How it works

### Keep the row-oriented operation direct

The class represents a record type and exposes a finder. Each instance carries record state and behavior, with methods that insert or update its row. Persistence knowledge is intentionally coupled to the model rather than placed in a separate mapper.

This works best when records and business concepts correspond reasonably well. It does not imply that every table must become a model or that one enormous record class should coordinate an entire application.

### Make validation and identity explicit

This example validates titles and stored completion flags. Its public properties are read-only; `rename` and `complete` implement the supported state changes. IDs are positive generated integers, with `None` meaning a new unsaved object. A missing finder result is `None`; saving a vanished existing row raises `LookupError`.

Model validation is not a substitute for database constraints. [Rails's validation guide](https://guides.rubyonrails.org/active_record_validations.html#uniqueness) specifically explains why an application uniqueness check does not prevent concurrent duplicates without a unique database index.

### Separate object state, SQL, and commit

Constructing this object does not insert it. Calling `complete` changes memory only. Calling `save` issues SQL but does not commit; the caller owns the supplied connection and transaction. Rails has its own [transaction behavior](https://api.rubyonrails.org/classes/ActiveRecord/Transactions/ClassMethods.html), including automatic transaction wrapping for saves. Do not transfer those details to every Active Record implementation.

A database rollback does not automatically restore Ruby or Python object attributes. After failure, discard or reload affected objects before relying on their persisted state. Even a generated ID assigned by an insert can remain on an object whose row was rolled back.

This implementation updates by ID only. Two independently loaded objects can overwrite each other's changes. The rename guard checks local state, not a fresh database snapshot. [Rails's optimistic-locking documentation](https://api.rubyonrails.org/classes/ActiveRecord/Locking/Optimistic.html) shows how a version field can detect stale writes; that mechanism is not implemented here. Authorization and tenant scoping also remain application responsibilities.

![A Task is loaded with done false. Calling complete changes the object to done true; save writes a provisional done true row. A later caller rollback restores the database row to done false while the object remains done true. Reloading creates an object reflecting the stored false value.](../assets/software-engineering/active-record-rollback.svg "Rollback restores database state, not ordinary object attributes. Reload or discard the affected record after the failed use case.")

## Worked example

### Let the record validate, change, and save itself

Previously, callers repeated row handling and task rules. They now call `Task.find`, `rename`, `complete`, and `save`. Save these two files together and run `python3 demo.py` with Python 3.10+ and standard-library SQLite.

Titles contain 1–80 printable characters and cannot be entirely whitespace. Completion is Boolean; SQLite stores it as 0 or 1. Completion is idempotent, and renaming a completed task is rejected. There is no separate mapper or automatic dirty tracker.

**task.py — record data, behavior, and SQL together**

```python
def require_title(value):
    if (
        type(value) is not str
        or not value.strip()
        or not value.isprintable()
        or len(value) > 80
    ):
        raise ValueError("Use 1–80 printable title characters")


def require_id(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Positive integer ID required")


class Task:
    def __init__(self, db, title, done=False, task_id=None):
        require_title(title)
        if type(done) is not bool:
            raise ValueError("Boolean completion required")
        if task_id is not None:
            require_id(task_id)
        self._db, self._title, self._done, self._id = db, title, done, task_id

    @property
    def task_id(self):
        return self._id

    @property
    def title(self):
        return self._title

    @property
    def done(self):
        return self._done

    @classmethod
    def find(cls, db, task_id):
        require_id(task_id)
        row = db.execute(
            "SELECT id, title, done FROM tasks WHERE id = ?",
            (task_id,),
        ).fetchone()
        if row is None:
            return None
        if type(row[2]) is not int or row[2] not in (0, 1):
            raise ValueError("Invalid stored completion")
        return cls(db, row[1], bool(row[2]), row[0])

    def rename(self, title):
        if self._done:
            raise ValueError("Completed task cannot be renamed")
        require_title(title)
        self._title = title

    def complete(self):
        self._done = True

    def save(self):
        values = (self._title, int(self._done))
        if self._id is None:
            cursor = self._db.execute(
                "INSERT INTO tasks (title, done) VALUES (?, ?)", values
            )
            self._id = cursor.lastrowid
        else:
            cursor = self._db.execute(
                "UPDATE tasks SET title = ?, done = ? WHERE id = ?",
                values + (self._id,),
            )
            if cursor.rowcount == 0:
                raise LookupError("Task missing")
```

**demo.py — explicit save and a failed use case**

```python
import sqlite3
from contextlib import closing
from task import Task


with closing(sqlite3.connect(":memory:")) as db:
    db.execute("""
        CREATE TABLE tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
                CHECK(length(title) BETWEEN 1 AND 80),
            done INTEGER NOT NULL CHECK(done IN (0, 1))
        )
    """)
    task = Task(db, "Label cartons")
    print("new ID:", task.task_id)
    with db:
        task.save()
    print("saved ID:", task.task_id)
    try:
        with db:
            task.complete()
            task.save()
            raise RuntimeError("Abort use case")
    except RuntimeError:
        pass
    print("object done:", task.done)
    fresh = Task.find(db, task.task_id)
    print("stored done:", fresh.done)
    fresh.complete()
    with db:
        fresh.save()
    print("committed done:", Task.find(db, fresh.task_id).done)
    try:
        fresh.rename("Different task")
    except ValueError as error:
        print("rename:", error)
# new ID: None
# saved ID: 1
# object done: True
# stored done: False
# committed done: True
# rename: Completed task cannot be renamed
```

The deliberate exception rolls back the first completion write. The existing object still says `True`; a fresh load says `False`. The caller completes and saves that fresh object successfully. Python's [connection context manager](https://docs.python.org/3/library/sqlite3.html#how-to-use-the-connection-context-manager) provides commit or rollback, while `closing` owns cleanup. Reusing an object after its connection closes will fail when it next needs database access. The example omits deletion, callbacks, identity caching, and stale-write detection.

## When to use it

Use Active Record for applications whose business concepts align with records and whose rules remain relatively local. It offers a short path from loading data to invoking behavior and saving changes.

A focused SQL procedure may be enough for a tiny tool. When rich object relationships or persistence independence become central, separate mapping may be worth its cost. A framework's conventions should support the design rather than decide it automatically.

## Tradeoffs and common mistakes

**Persistence coupling.** Model changes, database changes, and storage tests are connected. This can become costly as domain structure diverges from tables.

**Invisible work.** Framework associations and callbacks can hide extra queries and external effects. Sending before commit can announce rolled-back work; sending afterward can fail independently.

**Rollback confusion.** Database state, object state, and assigned IDs can disagree after failure. Do not treat an ID or successful SQL statement as proof of commit.

**Unrestricted input binding.** Avoid copying arbitrary request fields onto a record. Permit intended changes explicitly and enforce access policy separately.

## Related patterns

[[data-mapper|Data Mapper]] separates persistence knowledge from domain objects. Active Record deliberately combines those responsibilities.

[[domain-model|Domain Model]] concerns how business behavior and state are represented. Active Record can carry domain behavior, but increasingly complex models may benefit from persistence independence.

[[transaction-script|Transaction Script]] organizes rules around request procedures. Active Record places local record behavior and data access on the record itself.

[[service-layer|Service Layer]] can coordinate several records and a surrounding transaction, keeping an application operation from becoming an oversized record method.

## Sources

Fowler's [Active Record](https://martinfowler.com/eaaCatalog/activeRecord.html), in *Patterns of Enterprise Application Architecture*, establishes the pattern. Rails's official basics, validation, transaction, and optimistic-locking documentation provides concrete framework behavior; Python's SQLite documentation supports this example's transaction handling.

The task policy, hand-written Python implementation, and illustrations are original teaching material, not a reproduction of Rails's API.
