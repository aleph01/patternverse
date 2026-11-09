---
id: audit-logging
type: pattern
title: Audit Logging
summary: "Record attributable, structured evidence of significant operations and their outcomes, with explicit guarantees about capture, protection, and retention."
status: published
aliases:
  - Audit Log
verses:
  - software-engineering
tags:
  - security-access-boundaries
attribution: "Martin Fowler’s draft Audit Log catalog entry, OWASP Logging Cheat Sheet, NIST SP 800-92, and Python SQLite transaction documentation. Credit-adjustment example and illustration are original."
---

## Purpose and problem

A support agent adjusts a customer’s credit. Days later, an investigator can see the current balance but cannot establish which authenticated operator changed it, what request caused the change, or whether a failed attempt also modified state. A debug message saying “request complete” cannot answer those questions.

Audit Logging preserves evidence about significant actions for later accountability and reconstruction. The competing requirements are dependable capture and useful attribution without turning every log into another copy of sensitive business data. The design must also state what happens when recording fails; a silent gap can make a successful operation look as though it never happened.

## Core idea

**Record the event’s meaning at the boundary that knows it.** Capture an actor, action, target, outcome, and correlation identity, plus relevant time and version context. Application code often knows the authenticated person and business intent that a database or network device cannot infer from a shared service account.

Audit Log is an established name in Fowler’s draft catalog. Audit logging overlaps with security logging and operational logging, but its chosen records answer accountability questions. It is not automatically event sourcing: the audit record need not contain everything required to reconstruct authoritative application state.

![A trusted application operation changes a balance and inserts an attributable audit event in the same database transaction. Both commit together or both roll back. A separate protected collector can later receive committed records; delivery to that collector is a different guarantee.](../assets/software-engineering/audit-logging.svg "For this privileged adjustment, business state and its applied-event record share one commit boundary. This does not make remote collection synchronous or the records tamper-proof.")

## How it works

Choose an event vocabulary around questions the organization needs to answer. Distinguish an attempted operation, an authorization decision, a committed state change, and a response delivered to a caller. Each statement has a different observation boundary. A record of permission is not proof that execution succeeded, and a completed response is not proof that a person read it.

Obtain actor and effective service identities from trusted authentication and execution context. Treat request-provided names as data, not proof of identity. Use correlation IDs to join application, database, queue, and collector evidence, while keeping each system’s observation explicit. Record event time separately from collection time when transport can delay delivery.

Define the capture guarantee. A business update followed by an independent logging call can commit without a record if the process crashes between them. A shared database transaction can couple a state change to a local audit insertion. If a remote collector is required, a durable outbox or another delivery protocol is needed; a local transaction does not atomically commit across an unrelated service.

Protect the evidence independently of ordinary users and application operators where appropriate. Restrict write, read, modification, and deletion authority; monitor gaps and collection failures; define retention and controlled disposal. OWASP discusses exclusion of secrets, sensitive-data handling, injection-resistant records, and verification of failure behavior. NIST treats collection and analysis as an operational process rather than a one-time library installation.

Serialization and minimization matter. Structured fields avoid ambiguous concatenated messages, but a structured log can still disclose tokens or personal information. Select stable resource references and justified context rather than recording entire request bodies by default. Cryptographic chaining can help detect certain edits only when its keys, trusted checkpoints, and deletion assumptions are themselves protected.

## Worked example

### A credit adjustment and its local evidence

The fictional application chooses a strict policy for this privileged operation: no credit adjustment commits unless its audit row commits. This is not a universal policy for all diagnostic logging; blocking every request on a logging outage can itself create an availability problem.

The complete Python 3 program uses an in-memory SQLite database. Amounts are integer cents. The caller supplies an already authenticated actor and an authorization result; the example does not implement either mechanism. Its unique request ID prevents the same successful adjustment from being applied twice through this function.

```python
import sqlite3


def adjust(db, actor, request_id, cents, allowed=True, fail_audit=False):
    if type(cents) is not int or cents <= 0:
        raise ValueError("positive integer cents required")
    if not allowed:
        with db:
            db.execute("INSERT INTO audit VALUES (?, ?, ?, ?)",
                       (request_id, actor, cents, "denied"))
        raise PermissionError("adjustment denied")
    with db:
        db.execute("UPDATE balance SET cents = cents + ?", (cents,))
        outcome = "invalid" if fail_audit else "applied"
        db.execute("INSERT INTO audit VALUES (?, ?, ?, ?)",
                   (request_id, actor, cents, outcome))


def setup():
    db = sqlite3.connect(":memory:")
    db.executescript("""
        CREATE TABLE balance(cents INTEGER NOT NULL);
        INSERT INTO balance VALUES (0);
        CREATE TABLE audit(
            request_id TEXT PRIMARY KEY,
            actor TEXT NOT NULL,
            cents INTEGER NOT NULL,
            outcome TEXT CHECK(outcome IN ('applied', 'denied'))
        );
    """)
    return db


if __name__ == "__main__":
    db = setup()
    try:
        adjust(db, "agent-7", "R1", 500)
        try:
            adjust(db, "agent-7", "R2", 200, fail_audit=True)
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("audit failure must abort adjustment")
        try:
            adjust(db, "agent-8", "R3", 100, allowed=False)
        except PermissionError:
            pass
        assert db.execute("SELECT cents FROM balance").fetchone()[0] == 500
        rows = db.execute("SELECT request_id, outcome FROM audit ORDER BY request_id").fetchall()
        assert rows == [("R1", "applied"), ("R3", "denied")]
        print("balance: 500 cents; R1 applied; R3 denied; R2 rolled back")
    finally:
        db.close()
```

The printed line describes exactly the stored evidence. R2’s audit constraint failure rolls back its balance update, while R3’s denial record commits before the exception reaches the caller. No R2 audit event survives: investigators cannot infer that no attempt occurred from this transaction table alone. Recording failed attempts durably needs another deliberate capture path.

The example uses one balance row, one connection, and default transactional connection behavior. It has no identity verification, timestamp service, concurrent-update protocol, remote collector, or tamper-resistant storage. The connection context manages commit and rollback; the explicit `finally` closes the connection. Real multi-account adjustments must identify the account and enforce affected-row expectations.

## When to use it

Use this when significant operations must be attributable and reconstructable: administrative changes, financial adjustments, permission changes, or access to protected information. Define the questions first so the records contain evidence rather than an indiscriminate stream of payloads.

Ordinary application diagnostics may be sufficient for low-consequence troubleshooting. A specialized database access-history facility can complement application records, but it cannot invent the human identity or business context omitted upstream.

## Tradeoffs and common mistakes

Audit storage, collection, investigation, and retention require ongoing ownership. Excessive records can hide important events, increase cost, and create a new confidentiality exposure. Insufficient records can make an investigation impossible even when the system produced many log lines.

Do not equate append-only application conventions with tamper resistance. A privileged database writer may still edit or delete rows. Do not promise complete ordering from unsynchronized timestamps or treat correlation IDs as authenticated identities. Cross-service reconstruction needs clear clocks, versions, and scope.

Test full disks, queue overflow, collector outages, duplicate delivery, malformed fields, and access restrictions according to the selected guarantee. A record may demonstrate what a system observed; it cannot by itself establish intent, lawful purpose, or the truth of every claim supplied by another actor.

## Related patterns

[[data-access-audit-trails|Access Audit Trails]] specializes connected evidence for data access across application, database, and storage boundaries. Audit Logging also covers non-access business and administrative operations.

[[reference-monitor|Reference Monitor]] mediates protected operations. Audit records complement enforcement; recording an unauthorized action does not prevent it.

[[data-transactional-outbox|Transactional Outbox]] can carry committed audit events toward a separate collector without assuming a local database transaction includes that remote system.

## Sources

- Martin Fowler, [Audit Log](https://martinfowler.com/eaaDev/AuditLog.html): established catalog entry, explicitly draft material.
- OWASP, [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): event meaning, sensitive fields, protection, collection, and testing.
- NIST, [SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final): log-management infrastructure and operational processes; no claim of legal compliance is made here.
- Python, [SQLite transaction control](https://docs.python.org/3/library/sqlite3.html#transaction-control): database transaction behavior and connection management.

The credit-adjustment program and its failure policy are original teaching material.
