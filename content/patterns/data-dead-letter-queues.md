---
id: data-dead-letter-queues
type: pattern
title: Dead Letter Channel
summary: Move messages that leave the normal delivery or processing policy to a separate recovery channel, preserving evidence and ownership until their outcome is resolved.
status: published
aliases:
  - Dead-Letter Queues
  - Dead Letter Queues
  - Dead Letter Queue
  - DLQ
  - Dead Message Queue
tags:
  - data-engineering
  - execution-recovery
  - software-engineering
  - messaging
  - integration
verses:
  - software-engineering
  - data-engineering
attribution: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns (2003). Revised Patternverse article retaining its existing canonical ID and recovery focus.
---

## Purpose and problem

A packing service cannot reach its warehouse. Most operations recover after a short delay, but one instruction exhausts its retry allowance. Retrying forever consumes capacity; discarding it hides an unfulfilled order. A separate destination must preserve the instruction while normal processing continues where dependencies permit.

Moving it creates another obligation. Someone must know why it failed, what may already have happened, and how to resolve it. An empty source queue does not prove that the business work succeeded.

## Core idea

A **Dead Letter Channel** holds messages that cannot or should not continue under the normal delivery policy. Dead letter queue, dead message queue, and **DLQ** are established names for common implementations. The channel can be backed by a queue, topic, or other durable failure store; product guarantees differ.

The mental model is **leave the normal path, retain the obligation**. The original EIP pattern concerns messaging-system delivery failure. Its neighboring Invalid Message Channel concerns messages a receiver cannot understand. Modern products often use dead-letter facilities for processing failures too; classify those reasons explicitly rather than treating every failed message as corrupt data.

![Instruction E901 remains on the normal orders path while classified dependency failures are within a three-failure budget. At the third failure, a safe handoff preserves the original instruction and failure context in the dead letter channel. Diagnosis and repair precede controlled redrive through the normal idempotent receiver.](../assets/data-engineering/dead-letter-queues.svg "A parked instruction remains unresolved work. Redrive is an explicit recovery decision after repair, not an automatic loop that resets the retry budget.")

## How it works

### Define admission and preserve evidence

Specify which conditions leave normal processing: exhausted transient retries, expiration, delivery rejection, or a terminal processing verdict. A retry queue schedules another normal attempt; the dead letter channel separates work needing investigation or changed conditions.

Retain original bytes or a durable reference, logical identity, source destination, timestamps, failure category, attempt information, and processing version. Keep diagnostics separate from original evidence. A pointer to an expired payload cannot support recovery. Use structured codes in routine logs; raw payloads may require tighter access and retention controls.

Attempt counters need interpretation. SQS `maxReceiveCount` counts receives, not confirmed handler executions. RabbitMQ has distinct dead-letter triggers, including rejection without requeue, message expiration, queue length limits, and quorum delivery limits. These are product contracts, not interchangeable meanings of “three failures.”

### Make transfer and recovery dependable

Preserve the recoverable copy before releasing source ownership. Acknowledging first can lose work; publishing a copy first can duplicate it if acknowledgment fails. Use a suitable transaction or verified reliable transfer, with duplicate-safe recovery.

RabbitMQ documents that default dead-letter republishing lacks internal publisher confirms and can lose messages when the destination is unavailable. Its quorum queues support a stronger at-least-once configuration. Merely naming a dead-letter exchange does not prove safe transfer.

Assign an owner and track unresolved age, arrivals, repeated failures, and business impact. After repair, validate representative failures and redrive at a rate the destination can absorb. Preserve logical event identity even if transport IDs change: SQS redrive assigns new message IDs and enqueue times and can interleave old work with live traffic.

![One local SQLite transaction inserts the complete failure record and deletes the pending record. Commit leaves the instruction in the dead letter channel. A full destination or an error before commit leaves the source instruction intact. Broker acknowledgments and remote processing effects are outside this database simulation.](../assets/software-engineering/dead-letter-channel-transfer.svg "The example models a transactional local move. A real broker-to-store transfer needs its own documented safety contract; moving a message cannot undo earlier business effects.")

## Worked example

### A bounded local failure channel

Save these files together and run `python3 demo.py` with Python 3.11 or later. This simulation models disposition after classified dependency failures, not handler execution or broker acknowledgments. Its caller supplies an authoritative failure count; calls are not a way to count deliveries.

`channel.py` uses an initially idle, dedicated SQLite connection. Source receipt IDs are unique for the store's lifetime, event IDs identify business intent, and input bytes are immutable. The tiny failure-channel capacity of one exposes backpressure. The owner closes connections; timestamps are nonnegative integer milliseconds in one declared clock domain.

```python
import re
import sqlite3


def open_store(path):
    db = sqlite3.connect(path, isolation_level=None, timeout=5)
    try:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS pending (
                receipt_id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL,
                body BLOB NOT NULL CHECK (typeof(body)='blob' AND length(body)<=4096),
                enqueued_ms INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dead (
                receipt_id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL,
                body BLOB NOT NULL, enqueued_ms INTEGER NOT NULL,
                failed_at_ms INTEGER NOT NULL, failed_attempts INTEGER NOT NULL,
                failure_code TEXT NOT NULL, source_channel TEXT NOT NULL,
                consumer_version TEXT NOT NULL
            );
        """)
    except BaseException:
        db.close()
        raise
    return db


def disposition(db, receipt_id, failed_attempts, code, now_ms):
    if not isinstance(receipt_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", receipt_id):
        raise ValueError("Invalid receipt ID")
    if type(failed_attempts) is not int or not 1 <= failed_attempts <= 1000:
        raise ValueError("Invalid failure count")
    if code != "DEPENDENCY_UNAVAILABLE":
        raise ValueError("Unclassified failure")
    if type(now_ms) is not int or not 0 <= now_ms <= 2**63 - 1:
        raise ValueError("Invalid timestamp")
    db.execute("BEGIN IMMEDIATE")
    with db:
        row = db.execute(
            "SELECT event_id, body, enqueued_ms FROM pending WHERE receipt_id=?",
            (receipt_id,),
        ).fetchone()
        if row is None:
            if db.execute("SELECT 1 FROM dead WHERE receipt_id=?", (receipt_id,)).fetchone():
                return "already_parked"
            raise KeyError(receipt_id)
        if now_ms < row[2]:
            raise ValueError("Failure predates enqueue")
        if failed_attempts < 3:
            return "retry"
        if db.execute("SELECT COUNT(*) FROM dead").fetchone()[0] >= 1:
            raise OverflowError("Failure channel full")
        db.execute("INSERT INTO dead VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (receipt_id, *row, now_ms, failed_attempts, code, "orders", "packer-v1"))
        db.execute("DELETE FROM pending WHERE receipt_id=?", (receipt_id,))
    return "parked"
```

`demo.py` shows the budget boundary, restart-safe parking, and a full destination:

```python
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory
from channel import open_store, disposition


with TemporaryDirectory() as directory:
    path = Path(directory) / "channel.sqlite"
    with closing(open_store(path)) as db:
        db.execute("INSERT INTO pending VALUES (?, ?, ?, ?)",
                   ("D901", "E901", b"pack order O42", 0))
        print(disposition(db, "D901", 2, "DEPENDENCY_UNAVAILABLE", 20))
        print(disposition(db, "D901", 3, "DEPENDENCY_UNAVAILABLE", 30))
    with closing(open_store(path)) as db:
        print(disposition(db, "D901", 3, "DEPENDENCY_UNAVAILABLE", 30))
        print(db.execute("SELECT event_id, body, failed_attempts FROM dead").fetchone())
        db.execute("INSERT INTO pending VALUES (?, ?, ?, ?)",
                   ("D902", "E902", b"pack order O43", 0))
        try:
            disposition(db, "D902", 3, "DEPENDENCY_UNAVAILABLE", 40)
        except OverflowError as error:
            print("retained D902:", error)
```

Outputs are `retry`, `parked`, `already_parked`, `('E901', b'pack order O42', 3)`, and `retained D902: Failure channel full`. Reopening retains the first failure record. A full channel raises instead of deleting D902. SQLite serializes writers; its transaction commits the insertion and removal together or rolls both back. No scheduler, processing effect, external transfer, or redrive is implemented.

## When to use it

Use this pattern when problematic messages need a recoverable exception path with accountable ownership. It can contain exhausted dependency failures or platform delivery failures while unrelated work progresses.

If a short transient failure can recover within normal retry policy, keep it there. If every message fails after a bad deployment, pause or repair the consumer rather than flooding a channel with supposedly exceptional work.

## Tradeoffs and common mistakes

Dead-letter storage is not permanent safekeeping. Standard SQS message expiry remains tied to original enqueue time when entering a DLQ; FIFO behavior differs. Set retention against actual recovery time and preserve referenced payloads for that duration.

Moving a dependent command can break later commands for its key. Hold that sequence when required; unrelated keys may continue. Redrive does not restore original ordering or undo an uncertain prior write. Keep replay idempotent and record corrections with provenance. Recovery ends in verified processing, a linked superseding correction, or deliberate exclusion with a reason—not merely a lower queue depth.

## Related patterns

- [[data-bounded-retries|Bounded Retries]] defines when normal recovery stops; this channel preserves work beyond that policy.
- [[data-quarantine-invalid-records|Quarantine Invalid Records]] isolates data that fails an acceptance contract. Dead-lettered work may instead be valid but undeliverable or repeatedly unsuccessful.
- [[idempotent-receiver|Idempotent Receiver]] protects business effects when transfer or redrive repeats a logical operation.
- [[data-per-key-ordering|Per-Key Ordering]] preserves dependencies that cannot tolerate skipping one failed command.

## Sources

- Hohpe and Woolf: [Dead Letter Channel](https://www.enterpriseintegrationpatterns.com/patterns/messaging/DeadLetterChannel.html) and [Invalid Message Channel](https://www.enterpriseintegrationpatterns.com/patterns/messaging/InvalidMessageChannel.html) establish the names and neighboring concerns.
- [RabbitMQ: Dead Letter Exchanges](https://www.rabbitmq.com/docs/dlx) documents triggers, metadata, and transfer safety.
- Amazon SQS: [Dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html) and [controlled redrive](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html) document count, retention, ordering, and transport-identity semantics.
- [SQLite: Transactions](https://www.sqlite.org/lang_transaction.html) and [Python: sqlite3](https://docs.python.org/3/library/sqlite3.html) support explicit transaction control and connection ownership.

The local simulation, bounds, fixtures, and illustrations are original teaching material. This revision retains the existing Dead-Letter Queues article's canonical identity and recovery perspective.
