---
id: data-mapper
type: pattern
title: Data Mapper
summary: Move data between domain objects and database representations through a separate mapping layer, keeping persistence details out of the model.
status: published
aliases:
  - Data Mapper Pattern
  - Object-Relational Data Mapper
verses:
  - software-engineering
tags:
  - persistence
  - object-relational-mapping
  - persistence-ignorance
attribution: "Data Mapper as described by Martin Fowler in Patterns of Enterprise Application Architecture. Original Patternverse appointment-interval example, code, and native illustrations."
---

## Purpose and problem

An appointment application reasons about intervals with a start and an end. Its database stores a start minute and a duration. Putting SQL inside `Appointment` makes the model understand both representations. Moving the same conversion into every screen creates several versions of the arithmetic and validation.

The model needs to express appointment rules, while persistence needs to reconstruct and store those objects correctly. Neither should dictate the other's internal shape.

## Core idea

A **Data Mapper** transfers data between domain objects and a database through a separate layer. The mapper knows the object structure and the stored representation. Domain objects implement their behavior without calling the mapper or knowing table names.

The mental model is **the mapper knows both representations; the model knows its rules**. [Fowler's catalog](https://martinfowler.com/eaaCatalog/dataMapper.html) establishes this separation. Data Mapper Pattern and Object-Relational Data Mapper refer to this role here. The broader phrase “data mapping” can also describe conversion of data transfer objects (DTOs) or an extract-transform-load (ETL) transformation; those alone do not establish this persistence pattern.

![An Appointment contains a TimeSlot with start minute 540 and end minute 570. AppointmentMapper translates that object into an appointments row with appointment_key A-7, begin_minute 540, and duration_minutes 30. On loading, the mapper reconstructs the end as start plus duration. The model has no dependency on the mapper or SQL.](../assets/software-engineering/data-mapper-representations.svg "Write: duration = end − start. Read: end = start + duration. The mapper owns the representation change in both directions.")

## How it works

### Keep persistence knowledge on one side

The model defines valid intervals and operations such as overlap detection. The mapper selects columns, constructs objects, and translates object state into insert or update parameters. Application code invokes the persistence operation and owns the surrounding use case.

This differs from [Active Record](https://martinfowler.com/eaaCatalog/activeRecord.html), where a domain-oriented record object also supplies database access behavior. Data Mapper keeps those responsibilities separate. An ORM's configuration syntax does not settle that distinction: [SQLAlchemy documents](https://docs.sqlalchemy.org/en/20/orm/mapping_styles.html) both imperative and declarative configuration using its mapper machinery.

### Define reconstruction and write semantics

Specify missing records, identity, conversions, nullability, and invalid stored data. This mapper returns `None` for an unknown ID. It constructs a complete `TimeSlot`; an impossible interval fails rather than becoming an apparently valid appointment.

Reconstruction is not automatically the same operation as creating a new business event. Loading an old appointment should not resend its confirmation. This example's constructors validate data but perform no external effects.

Writes are explicit. `insert` adds a new appointment; `update` changes an existing row and rejects an unknown ID. Repeated loads produce independent immutable objects, without automatic dirty tracking. [Identity Map](https://martinfowler.com/eaaCatalog/identityMap.html) is an additional pattern for managing repeated loads within a scope, not an automatic property of every mapper.

### Separate mapping from transaction policy

The caller owns the connection, commit, rollback, and closing. The mapper issues statements without committing, allowing several operations to participate in one transaction.

Mapping alone does not prevent stale updates. This example's update matches only the appointment ID and can overwrite a later change. Production concurrency policies may use locks or compare an expected version; [SQLAlchemy's version-counter documentation](https://docs.sqlalchemy.org/en/20/orm/versioning.html) illustrates the latter mechanism. Authorization and tenant scoping also need explicit enforcement.

![The caller constructs a replacement Appointment and explicitly asks the mapper to update it. The mapper writes a provisional row change inside a caller-owned transaction. Caller commit makes it durable, while rollback discards it. Neither mapping nor object replacement automatically saves the appointment.](../assets/software-engineering/data-mapper-lifecycle.svg "The mapper translates and writes. The caller decides the transaction outcome; the old domain object remains unchanged.")

## Worked example

### Round-trip an interval without teaching it SQL

Before the change, callers computed end times from duration columns themselves. Afterward, the mapper reconstructs a `TimeSlot` that can immediately perform domain operations. Updating a replacement object uses the inverse conversion.

Save these three files together and run `python3 demo.py` with Python 3.10+ and standard-library SQLite. Times are whole minutes after midnight in one abstract local day. Intervals are half-open: the start is included, the end excluded, and adjacent slots do not overlap. IDs are nonblank ASCII text, preserved exactly. This example does not model dates, time zones, or daylight-saving transitions.

**model.py — valid domain objects, no persistence imports**

```python
from dataclasses import dataclass


def require_id(value):
    if type(value) is not str or not value.strip() or not value.isascii():
        raise ValueError("Nonblank ASCII ID required")


@dataclass(frozen=True)
class TimeSlot:
    start: int
    end: int

    def __post_init__(self):
        if type(self.start) is not int or type(self.end) is not int:
            raise ValueError("Whole minutes required")
        if not 0 <= self.start < self.end <= 1440:
            raise ValueError("Invalid interval")

    def overlaps(self, other):
        if type(other) is not TimeSlot:
            raise TypeError("TimeSlot required")
        return self.start < other.end and other.start < self.end


@dataclass(frozen=True)
class Appointment:
    appointment_id: str
    slot: TimeSlot

    def __post_init__(self):
        require_id(self.appointment_id)
        if type(self.slot) is not TimeSlot:
            raise TypeError("TimeSlot required")
```

**mapper.py — explicit reconstruction and inverse writes**

```python
from model import Appointment, TimeSlot, require_id


class AppointmentMapper:
    def __init__(self, db):
        self.db = db

    def find(self, appointment_id):
        require_id(appointment_id)
        row = self.db.execute(
            "SELECT appointment_key, begin_minute, duration_minutes "
            "FROM appointments WHERE appointment_key = ?",
            (appointment_id,),
        ).fetchone()
        return None if row is None else Appointment(row[0], TimeSlot(row[1], row[1] + row[2]))

    def _values(self, appointment):
        if type(appointment) is not Appointment:
            raise TypeError("Appointment required")
        slot = appointment.slot
        return slot.start, slot.end - slot.start, appointment.appointment_id

    def insert(self, appointment):
        self.db.execute(
            "INSERT INTO appointments "
            "(begin_minute, duration_minutes, appointment_key) "
            "VALUES (?, ?, ?)",
            self._values(appointment),
        )

    def update(self, appointment):
        cursor = self.db.execute(
            "UPDATE appointments SET begin_minute = ?, duration_minutes = ? "
            "WHERE appointment_key = ?",
            self._values(appointment),
        )
        if cursor.rowcount == 0:
            raise LookupError("Appointment missing")
```

**demo.py — behavior after loading and explicit persistence**

```python
import sqlite3
from contextlib import closing
from model import Appointment, TimeSlot
from mapper import AppointmentMapper


with closing(sqlite3.connect(":memory:")) as db:
    db.execute("""
        CREATE TABLE appointments (
            appointment_key TEXT PRIMARY KEY,
            begin_minute INTEGER NOT NULL,
            duration_minutes INTEGER NOT NULL
        )
    """)
    mapper = AppointmentMapper(db)
    with db:
        mapper.insert(Appointment("A-7", TimeSlot(540, 570)))
    loaded = mapper.find("A-7")
    print("loaded end minute:", loaded.slot.end)
    print("adjacent overlaps:", loaded.slot.overlaps(TimeSlot(570, 600)))
    replacement = Appointment("A-7", TimeSlot(600, 645))
    with db:
        mapper.update(replacement)
    print(
        "stored start, duration:",
        db.execute(
            "SELECT begin_minute, duration_minutes FROM appointments"
        ).fetchone(),
    )
    print("reloaded end minute:", mapper.find("A-7").slot.end)
    print("old snapshot end:", loaded.slot.end)
    print("missing:", mapper.find("unknown"))
# loaded end minute: 570
# adjacent overlaps: False
# stored start, duration: (600, 45)
# reloaded end minute: 645
# old snapshot end: 570
# missing: None
```

The initial 09:00–09:30 slot loads with its overlap behavior intact. The replacement is 10:00–10:45, stored as start 600 and duration 45. Reloading restores end 645; the old object still ends at 570. An unknown ID is a missing result, not a fabricated empty interval.

Python's [connection context manager](https://docs.python.org/3/library/sqlite3.html#how-to-use-the-connection-context-manager) handles the caller's commit or rollback; `closing` handles connection cleanup. Invalid legacy intervals are rejected on load. Database errors, including duplicate inserts, propagate. The mapper provides no delete operation, identity map, version check, or scheduling-conflict enforcement.

## When to use it

Use Data Mapper when a meaningful domain model needs independence from storage shape, when object and relational structures differ, or when persistence changes repeatedly disturb business logic.

For straightforward record entry, Active Record or a simpler table-oriented interface may suffice. Many ORMs already provide mapping machinery; handwritten mapping should earn its maintenance cost.

## Tradeoffs and common mistakes

**Mapping maintenance.** Every supported representation change, relationship, and conversion needs verification. Test both reading and writing; a correct load does not prove a correct save.

**Incomplete reconstruction.** Silently substituting defaults can conceal corrupt data and alter business meaning. Make restoration policy explicit.

**Hidden I/O and object identity.** Lazy loading can create unexpected queries. Multiple detached instances can also diverge; neither is solved merely by naming a mapper.

**Persistence mistaken for coordination.** Writing a row is not committing a use case, and unconditional updates can lose changes. Choose transaction and concurrency policies separately.

## Related patterns

[[domain-model|Domain Model]] owns behavior and state. Data Mapper lets its representation differ from the database's representation.

[[repository|Repository]] offers domain-oriented collection access. It may use a mapper underneath; collection semantics and representation transfer are distinct roles.

[[value-object|Value Object]] represents validated domain values. A mapper may reconstruct one value object from several columns, as with `TimeSlot` here.

[[service-layer|Service Layer]] coordinates the application operation and its persistence boundary; the mapper handles translation and statements.

## Sources

Fowler's [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html), in *Patterns of Enterprise Application Architecture*, establishes the pattern. His Active Record and Identity Map entries, SQLAlchemy's official mapping and versioning documentation, and Python's SQLite documentation linked above support the distinctions and implementation choices.

The appointment model, minute-based schema, code, and illustrations are original Patternverse teaching material.
