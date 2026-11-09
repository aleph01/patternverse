---
id: transaction-script
type: pattern
title: Transaction Script
summary: Organize business logic around procedures that handle complete application requests, using direct data access or shared helpers as needed.
status: published
aliases:
  - Transaction Scripts
  - Transaction Script Pattern
verses:
  - software-engineering
tags:
  - domain-modeling
  - procedural-business-logic
  - request-handling
attribution: "Transaction Script as described by Martin Fowler in Patterns of Enterprise Application Architecture. Original Patternverse stock-issue example, code, and native illustrations."
---

## Purpose and problem

A small warehouse tool records stock issues. An operator selects a product, enters a quantity, and submits the request. The application checks the input, loads available stock, rejects an excessive quantity, subtracts the units, and records the movement.

There are few rules, and their sequence is easy to follow. Building a network of product, allocation, and movement objects would introduce machinery without making the decision clearer. Leaving the rules inside a screen handler, however, makes them difficult to reuse and verify. The application needs an explicit procedure for the business request.

## Core idea

A **Transaction Script** organizes business logic around a procedure that handles a request. It can validate inputs, retrieve data, make decisions, calculate values, and save changes. Shared subtasks can become helpers without changing that organization.

The mental model is **a request has a procedure; the procedure contains its rules**. [Fowler's catalog](https://martinfowler.com/eaaCatalog/transactionScript.html) establishes this request-oriented organization, including direct database access or a thin wrapper. Transaction Scripts is the plural form; Transaction Script Pattern names the same idea here.

The name does not require an interpreted scripting language, SQL script file, or stored procedure. Nor does it mean that a business request automatically becomes an atomic database transaction. Those are separate implementation decisions. A read-only request can also be organized procedurally.

![An issue-stock request enters the issue_stock procedure. The procedure validates the quantity, reads stock, checks units against availability, calculates the remainder, and writes stock plus a movement record. The capacity decision lives inside the procedure; database rows hold data rather than supplying business-object methods.](../assets/software-engineering/transaction-script-organization.svg "The business rule is expressed directly in the request procedure. Data access can be direct or delegated to a thin helper.")

## How it works

### Organize around an operation

Give a procedure a business-level name such as `issue_stock`, rather than exposing a sequence of generic setters. A web adapter or command-line interface can call it after translating its inputs. Formatting a response belongs to that interface; the stock rule belongs to the procedure.

Keep related steps readable in execution order. Extract repeated validation or data access where it clarifies several operations, but avoid turning every line into a separate abstraction. A helper does not need to become a domain object merely because it is reused.

This differs from a [Domain Model](https://martinfowler.com/eaaCatalog/domainModel.html), where interacting objects combine business state and behavior. It also differs from [Table Module](https://martinfowler.com/eaaCatalog/tableModule.html), which groups logic around a table or view. Transaction Script groups the work around a request, even when that request touches several tables.

### Choose the persistence boundary deliberately

In this example, subtracting stock and inserting a movement must succeed together. The procedure therefore owns a local database transaction. It returns remaining stock only after commit. A failed insert rolls back the earlier subtraction.

The caller owns opening and closing the connection. The procedure requires an idle connection configured for explicit transaction control and rejects nesting inside someone else's transaction. Other applications may place this responsibility in a shared transaction helper or surrounding application service.

### State what protects concurrent requests

Reading five units and later writing two is unsafe if another writer can change the same stock between those actions. The example starts an SQLite write transaction before reading. [SQLite's transaction documentation](https://sqlite.org/lang_transaction.html) explains that `BEGIN IMMEDIATE` acquires that transaction and can fail when another writer is active. A production contention policy needs to distinguish a busy database from insufficient stock.

The pattern itself supplies no locking, authorization, retry safety, or external delivery guarantee. Authorization must apply wherever the operation is exposed. A local rollback cannot undo a carrier request or an email already sent. Keep such effects outside the local transaction and arrange their reliability separately when needed.

## Worked example

### Issue units and preserve the movement record

Previously, a screen updated stock and an import tool wrote movements independently. Both now call `issue_stock`; its procedural body owns the quantity rule and the two writes. There is no domain-object collaboration hidden behind it.

Save these two files together and run `python3 demo.py` with Python 3.10 or later and its standard-library SQLite module. Counts are whole units of one SKU. IDs are nonblank opaque text; the procedure preserves their exact spelling.

Use an idle connection with `isolation_level=None`. Python's [transaction-control documentation](https://docs.python.org/3/library/sqlite3.html#transaction-control-via-the-isolation-level-attribute) explains how this configuration permits explicit SQL transaction management. The demo uses an in-memory database and closes the connection afterward.

**transactions.py — business rules organized as a request procedure**

```python
def issue_stock(db, movement_id, sku, units):
    if any(type(i) is not str or not i.strip() for i in (movement_id, sku)):
        raise ValueError("Nonblank IDs required")
    if type(units) is not int or units <= 0:
        raise ValueError("Units must be a positive integer")
    if db.isolation_level is not None or db.in_transaction:
        raise RuntimeError("Idle explicit-transaction connection required")
    db.execute("BEGIN IMMEDIATE")
    try:
        row = db.execute("SELECT available FROM stock WHERE sku = ?", (sku,)).fetchone()
        if row is None:
            raise LookupError("Unknown SKU")
        available = row[0]
        if type(available) is not int or available < 0:
            raise ValueError("Invalid stock record")
        if units > available:
            raise ValueError("Insufficient stock")
        left = available - units
        db.execute("UPDATE stock SET available = ? WHERE sku = ?", (left, sku))
        db.execute("INSERT INTO movements VALUES (?, ?, ?)", (movement_id, sku, units))
        db.execute("COMMIT")
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise
    return left
```

**demo.py — success, duplicate rollback, and the exact remainder**

```python
import sqlite3
from contextlib import closing
from transactions import issue_stock


with closing(sqlite3.connect(":memory:", isolation_level=None)) as db:
    db.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, available INTEGER NOT NULL CHECK(available >= 0))")
    db.execute("CREATE TABLE movements (id TEXT PRIMARY KEY, sku TEXT NOT NULL, units INTEGER NOT NULL CHECK(units > 0))")
    db.execute("INSERT INTO stock VALUES ('P-7', 5)")
    print("remaining:", issue_stock(db, "I-1", "P-7", 3))
    try:
        issue_stock(db, "I-1", "P-7", 1)
    except sqlite3.IntegrityError:
        print("duplicate: rolled back")
    print("after duplicate:", db.execute("SELECT available FROM stock").fetchone()[0])
    print("exact remainder:", issue_stock(db, "I-2", "P-7", 2))
    try:
        issue_stock(db, "I-3", "P-7", 1)
    except ValueError as error:
        print("empty:", error)
    print("movement rows:", db.execute("SELECT COUNT(*) FROM movements").fetchone()[0])
# remaining: 2
# duplicate: rolled back
# after duplicate: 2
# exact remainder: 0
# empty: Insufficient stock
# movement rows: 2
```

The duplicate attempt temporarily changes two available units to one, then fails on the movement's primary key. Rollback restores two. Taking those exact two units succeeds; taking another unit fails without creating a movement. Each success returns remaining units at commit, which another request may subsequently change.

![A successful issue starts with five units, subtracts three, inserts movement I-1, and commits two remaining units. A later attempt using duplicate movement I-1 starts with two units, temporarily subtracts one, fails to insert, and rolls back to two. The original I-1 movement remains three units.](../assets/software-engineering/transaction-script-outcomes.svg "Both rows execute the same procedure. A local transaction preserves the stock-and-movement relationship when the second write fails.")

This records a local inventory decision. It implements no physical dispatch, authentication, reservations, cancellation, automatic contention retry, or cross-database coordination. Duplicate IDs cause rejection rather than returning the original result; that is not a complete idempotency protocol.

## When to use it

Use Transaction Script when requests have straightforward rules, a procedural sequence matches the business operation, and a richer object model would add little clarity. Simple administrative workflows and focused import operations often fit.

A single small function may be the complete implementation. Growth is a signal to reconsider the organization when the same invariants recur across many procedures or changing one rule requires coordinated edits throughout them.

## Tradeoffs and common mistakes

**Rules copied between scripts.** Receiving, issuing, and adjusting stock may gradually duplicate policy. Extract a shared concept when it has a stable meaning; do not accept inconsistent copies as the price of simplicity.

**One enormous procedure.** Request-oriented organization permits helpers and modules. Long branches and tangled dependencies are reasons to refactor, not defining features.

**Confusing sequencing with atomicity.** Consecutive writes need a real consistency mechanism. A method name or exception handler alone cannot reverse committed changes.

**Retrying blindly.** Losing a response after commit leaves the caller uncertain. Repeated requests need an explicit identity and outcome policy before automatic retries are safe.

## Related patterns

[[domain-model|Domain Model]] distributes business behavior among meaningful objects. Transaction Script keeps it primarily in procedures for requests.

[[service-layer|Service Layer]] defines an application boundary and coordinates operations. Its operations can use transaction scripts or delegate to a domain model.

[[command|Command]] represents an invocation as an object or value, for example to queue it. The invoked behavior can still be a transaction script; packaging and business-logic organization are separate choices.

## Sources

Fowler's [Transaction Script](https://martinfowler.com/eaaCatalog/transactionScript.html), in *Patterns of Enterprise Application Architecture*, establishes the pattern. His Domain Model and Table Module entries, Stafford's Service Layer entry, and official SQLite/Python documentation linked above support the distinctions and implementation details.

The warehouse scenario, procedural code, and illustrations are original Patternverse teaching material.
