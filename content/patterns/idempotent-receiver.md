---
id: idempotent-receiver
type: pattern
title: Idempotent Receiver
summary: Make repeated deliveries of the same logical message leave the receiver's protected business state as if that message had been handled once.
status: published
aliases:
  - Idempotent Consumer
tags:
  - software-engineering
  - messaging
  - integration
verses:
  - software-engineering
attribution: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns (2003); Chris Richardson, Idempotent Consumer.
---

## Purpose and problem

A stock receiver handles a receipt for 40 mugs. It commits the inventory change, then loses its connection before acknowledging the message. The broker delivers the receipt again. Adding another 40 would turn a transport retry into a fictional shipment.

Acknowledging first reverses the danger: a crash can lose the receipt without updating stock. The receiver needs retries to recover from uncertainty, while preserving the distinction between one intended change delivered twice and two legitimate changes with identical contents.

## Core idea

An **Idempotent Receiver** makes repeated handling of one logical message equivalent, for its protected business effect, to handling it once. Hohpe and Woolf describe two approaches: give messages inherently repeatable semantics, or explicitly recognize duplicates. Richardson's **Idempotent Consumer** names the same receiver-side concern.

The mental model is **repeat delivery, preserve intent**. Setting a named preference to a value can be naturally repeatable; adding a quantity usually needs remembered operation identity. Even replacement messages may need a version guard so an old retry cannot overwrite newer state.

![Warehouse event E901 adds 40 mug units and records its processed identity in the same database transaction. The acknowledgment is lost. Redelivery with the same consumer, source, event ID, SKU, and quantity finds the committed record and leaves stock at 40. A distinct event E902 can legitimately add another 40.](../assets/software-engineering/idempotent-receiver-replay.svg "The receiver protects the stock change, not the number of deliveries. The same intended receipt is suppressed; a different receipt with identical contents remains legitimate work.")

## How it works

### Identify intent within a receiver's scope

Use a stable logical event or command ID across retries. A broker delivery tag, trace ID, or fresh ID generated for each attempt is unsuitable. An order ID alone can also collapse several legitimate changes into one.

A processed-message key commonly includes a logical consumer identity and the originating source as well as the event ID. Workers sharing one consumer responsibility share that ledger; independently interested consumers need their own scope. Keep the consumer identity stable through restarts and deployments. A new scope can replay old effects unless migration rules prevent it.

Compare meaningful input when a key already exists. Reusing E901 for a different SKU or quantity is a conflict, not a harmless duplicate. Store those fields or a carefully defined canonical fingerprint. Source identity must come from an authorized boundary; a source string is not authentication.

### Commit the memory and the effect together

A separate cache lookup followed by an update permits two workers to apply the same message. Use database uniqueness and transaction isolation, or an equivalent atomic destination operation, to coordinate ownership.

For the ledger approach, record the identity and update business state in one transaction. If either step fails, both must roll back. Only after commit should the delivery be acknowledged. A redelivery after commit can recognize the completed effect and be acknowledged again. RabbitMQ distinguishes consumer acknowledgments from publisher confirms; neither automatically coordinates this application transaction.

Retain identities for the entire possible replay period. Expiring a record makes that operation look new again. Keep retention, manual replay, source generations, and receiver migrations consistent. Framework duplicate selectors can assist classification, but cannot independently make unrelated business effects atomic.

![Before database commit, a failed stock constraint rolls back both the processed-message row and stock change, so retry remains possible. After commit, losing acknowledgment leaves both records durable, so redelivery is a duplicate. An external email or remote API call sits outside this database boundary and has no protection from this transaction.](../assets/software-engineering/idempotent-receiver-boundary.svg "The atomic boundary contains the processed record and inventory update. Acknowledgment follows commit; external effects require their own reliable handoff or idempotency contract.")

## Worked example

### A receipt ledger and stock in one database

Save these files together and run `python3 demo.py` with Python 3.11 or later and SQLite 3.24 or later. The receiver accepts authorized receipt messages with ASCII source, event, and SKU identifiers of 1–64 characters and 1–1000 physical units. This teaching store caps stock at 1,000,000 units per SKU; exceeding that bound fails the transaction.

`receiver.py` opens a dedicated, initially idle connection. `BEGIN IMMEDIATE` obtains SQLite's write transaction before the lookup, serializing competing writers. The connection context commits an open transaction on normal exit and rolls it back on error; it does not close the connection. The caller owns closure.

```python
import re
import sqlite3

CONSUMER = "stock-receipts"


def open_store(path):
    db = sqlite3.connect(path, isolation_level=None, timeout=5)
    try:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS processed (
                consumer TEXT NOT NULL, source TEXT NOT NULL, event_id TEXT NOT NULL,
                sku TEXT NOT NULL, units INTEGER NOT NULL,
                PRIMARY KEY (consumer, source, event_id)
            );
            CREATE TABLE IF NOT EXISTS inventory (
                sku TEXT PRIMARY KEY NOT NULL,
                units INTEGER NOT NULL CHECK (units BETWEEN 0 AND 1000000)
            );
        """)
    except BaseException:
        db.close()
        raise
    return db


def receive(db, source, event_id, sku, units):
    for value in (source, event_id, sku):
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value):
            raise ValueError("Invalid identifier")
    if type(units) is not int or not 1 <= units <= 1000:
        raise ValueError("Units must be an integer from 1 to 1000")
    key = (CONSUMER, source, event_id)
    db.execute("BEGIN IMMEDIATE")
    with db:
        previous = db.execute(
            "SELECT sku, units FROM processed WHERE consumer=? AND source=? AND event_id=?",
            key,
        ).fetchone()
        if previous is not None:
            if previous != (sku, units):
                raise ValueError("Identity reused with different payload")
            return "duplicate"
        db.execute("INSERT INTO processed VALUES (?, ?, ?, ?, ?)", (*key, sku, units))
        db.execute("""
            INSERT INTO inventory VALUES (?, ?)
            ON CONFLICT(sku) DO UPDATE SET units = inventory.units + excluded.units
        """, (sku, units))
    return "applied"
```

`demo.py` discards the first success status, simulating lost acknowledgment, then reopens the same file before redelivery:

```python
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
from receiver import open_store, receive


def stock(db):
    return db.execute("SELECT units FROM inventory WHERE sku='MUG'").fetchone()[0]


with TemporaryDirectory() as directory:
    path = Path(directory) / "receipts.sqlite"
    with closing(open_store(path)) as db:
        receive(db, "warehouse-a", "E901", "MUG", 40)
        print("before lost acknowledgment:", stock(db))
    with closing(open_store(path)) as db:
        print(receive(db, "warehouse-a", "E901", "MUG", 40), stock(db))
        print(receive(db, "warehouse-a", "E902", "MUG", 40), stock(db))
        try:
            receive(db, "warehouse-a", "E901", "MUG", 41)
        except ValueError as error:
            print("conflict:", error)
        print("final stock:", stock(db))
```

The output is `before lost acknowledgment: 40`, `duplicate 40`, `applied 80`, `conflict: Identity reused with different payload`, and `final stock: 80`. Both success statuses follow a completed transaction. Exceptions propagate; a transport adapter must distinguish temporary database contention from invalid messages needing quarantine or investigation. No broker acknowledgment is actually sent here.

## When to use it

Use this pattern for receiver effects exposed to redelivery: stock receipts, billing adjustments, webhook handling, or replayed integration commands. Establish the protected effect and replay identity before selecting duplicate-detection infrastructure.

If the operation is already safely repeatable at its destination, an additional ledger may be unnecessary. Verify every effect: repeating a row assignment safely says nothing about a notification sent beside it.

## Tradeoffs and common mistakes

The ledger consumes storage and adds lookup, locking, and write costs. Repeated messages still consume resources. This example never deletes identities, so an operational retention policy is required. SQLite serializes writers; a busy database can reject a call after the configured wait, requiring later retry rather than a false success.

Idempotency does not impose ordering between distinct events, guarantee eventual success, or make multiple databases commit together. Sending email inside the transaction does not let SQLite undo the email. Use an outbox or a destination-supported idempotency key at that boundary. A payment provider's key retention and response-replay semantics are separate contracts.

## Related patterns

- [[data-idempotent-writes|Idempotent Writes]] explains repeatable destination operations across database, API, and batch contexts. This article focuses on the receiving endpoint and its message acknowledgment boundary.
- [[data-transactional-outbox|Transactional Outbox]] records publication intent with local state. Its eventual deliveries still need idempotent receiving effects.
- [[correlation-identifier|Correlation Identifier]] associates messages with a conversation. One conversation can contain several legitimate operations, so its identifier is not automatically a deduplication key.
- [[aggregator|Aggregator]] may suppress duplicate members while forming a result. That local bookkeeping does not protect a downstream effect from repeated summary deliveries.

## Sources

- [Hohpe and Woolf: Idempotent Receiver](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html) establishes repeatable semantics and explicit duplicate detection.
- [Richardson: Idempotent Consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html) describes receiver-scoped processed identities and transactional business changes.
- [SQLite: Transactions](https://www.sqlite.org/lang_transaction.html), [UPSERT](https://sqlite.org/lang_upsert.html), and [Python: sqlite3](https://docs.python.org/3/library/sqlite3.html) support the example's transaction and resource rules.
- [RabbitMQ: Acknowledgements and Confirms](https://www.rabbitmq.com/docs/confirms) distinguishes transport boundaries; [Spring Integration: Idempotent Receiver](https://docs.spring.io/spring-integration/reference/handler-advice/idempotent-receiver.html) describes endpoint advice and application-owned behavior.

The two-file receipt simulation, stock limit, validation policy, fixtures, and illustrations are original teaching material. It models one local database effect, without external calls, authentication, ledger cleanup, or power-loss testing.
