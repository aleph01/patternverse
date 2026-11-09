---
id: lazy-load
type: pattern
title: Lazy Load
summary: Load the lightweight part of an object first, keeping a way to fetch its deferred data when that data is actually needed.
status: published
aliases:
  - Lazy Loading
  - Lazy Load Pattern
verses:
  - software-engineering
tags:
  - persistence
  - deferred-loading
  - resource-lifecycle
attribution: "Lazy Load as described by Martin Fowler in Patterns of Enterprise Application Architecture, with supporting official SQLAlchemy and Python documentation. Original Patternverse deferred-document example, code, and native illustrations."
---

## Purpose and problem

A reporting screen lists document titles. Opening a document needs its large body, but most documents are never opened. The current reader fetches every body while building the list, consuming database time, transferred bytes, and memory for content the user may never request.

Fetching only titles fixes the initial cost, but callers still need a reliable path to the omitted data. Without an agreed mechanism, every caller must discover whether a document is complete and reconstruct the right lookup. The design needs to defer work without losing the information required to finish it.

## Core idea

**Lazy Load**, often called lazy loading, leaves part of an object's data unloaded and retains a way to retrieve it on demand. Access crosses that deferred boundary only when the data is needed.

The mental model is **carry enough now; fetch the rest on first use**. [Fowler's catalog](https://martinfowler.com/eaaCatalog/lazyLoad.html) establishes this persistence pattern. Deferring images or code modules uses a similar timing idea, but this article concerns partially loaded application objects and their data.

The benefit comes from avoiding work that never becomes necessary. Needed work still costs time, and its failures move to a later point. Remembering a successful load is common; it introduces a separate retention and freshness policy.

![A document is first loaded with its title and an unloaded body marker. Reading the title performs no body query. The first body access selects and stores the body; later accesses return the stored value without another query. A document whose body is never accessed performs no body query.](../assets/software-engineering/lazy-load-access.svg "The deferred read happens at the body-access boundary. This example retains the first successful result per Document instance, including an empty string or NULL.")

## How it works

### Preserve a route to the omitted data

The lightweight object needs an identity or loader that can locate the missing data. The reader must genuinely omit that payload from its initial query. Merely delaying conversion after fetching the full row does not avoid the transfer.

Fowler distinguishes four implementation forms. **Lazy initialization** checks an unloaded marker before filling a field. A **virtual proxy** defers creating its real subject. A **value holder** exposes an explicit retrieval operation. A **ghost** is the actual object, initially mostly empty, that fills its fields when used. These are variants, not interchangeable names for the whole pattern.

The example uses lazy initialization: a property checks a unique sentinel. `None` cannot be that marker because SQL NULL is a legitimate loaded result. Empty text also counts as loaded. The callback captures the original document ID; changing the local title cannot redirect it.

### Publish only a successful result

The body becomes loaded only after the database lookup and type check succeed. A missing row or storage failure propagates and leaves the marker intact. Another access attempts the read again while the reader remains active; there is no automatic retry loop or cached exception.

The implementation assumes sequential, non-reentrant use. Two concurrent callers could both observe the unloaded state and issue reads. A shared loader would need coordination and a defined policy for waiting, cancellation, and failure. SQLAlchemy's [session guidance](https://docs.sqlalchemy.org/en/20/orm/session_basics.html#is-the-session-thread-safe-is-asyncsession-safe-to-share-in-concurrent-tasks) likewise requires deliberate thread/task ownership.

### Keep the loading context available

A deferred read still needs a usable connection and the right access context. SQLAlchemy's [column-loading documentation](https://docs.sqlalchemy.org/en/20/orm/queryguide/columns.html#using-load-only-to-reduce-loaded-columns) illustrates omitted columns and failure when an unloaded object is detached. Its [detached-instance guidance](https://docs.sqlalchemy.org/en/20/errors.html#parent-instance-x-is-not-bound-to-a-session-lazy-load-deferred-load-refresh-etc-operation-cannot-proceed) explains why loading needed data before detachment can be appropriate.

Here, the caller owns transactions and connection closing. The reader owns permission to perform its deferred lookups during its single-use context. After exit, an unloaded body rejects access before SQL. A successfully loaded value remains readable from memory and releases its loader callback. Unused documents retain callbacks, so avoid keeping them as long-lived handles to a reader.

![An unloaded document attempts a body read. Success stores the value and releases the callback; failure propagates while the body remains unloaded. After the reader closes, unloaded access is rejected before SQL, while an already-loaded body remains readable from memory.](../assets/software-engineering/lazy-load-lifecycle.svg "Unloaded, loaded, and failed access have different consequences. Reader exit prevents new I/O; it does not erase a body that was already loaded.")

## Worked example

### A title list that does not fetch every body

Previously, listing titles also selected all bodies. The new reader selects only ID and title. Save these two files together and run `python3 demo.py` with Python 3.10+ and standard-library SQLite.

Document IDs are positive integers, excluding booleans. Stored titles must be text; bodies may be text, empty text, or NULL. A missing header returns `None`; disappearance before body access raises `LookupError`. Each wrapper retains its own successful result; repeated header lookups create separate wrappers.

**documents.py — defer the body, retain a successful result**

```python
_UNLOADED = object()


class Document:
    def __init__(self, title, load_body):
        self.title = title
        self._load_body = load_body
        self._body = _UNLOADED

    @property
    def body(self):
        if self._body is _UNLOADED:
            value = self._load_body()
            self._body = value
            self._load_body = None
        return self._body


class DocumentReader:
    def __init__(self, db):
        self._db = db
        self._entered = self._closed = False

    def __enter__(self):
        if self._entered or self._closed:
            raise RuntimeError("Single-use reader")
        self._entered = True
        return self

    def __exit__(self, *error):
        self._closed = True

    def _check(self):
        if not self._entered or self._closed:
            raise RuntimeError("Active reader required")

    def get(self, document_id):
        self._check()
        if type(document_id) is not int or document_id <= 0:
            raise ValueError("Positive integer ID required")
        row = self._db.execute(
            "SELECT id, title FROM documents WHERE id = ?", (document_id,)
        ).fetchone()
        if row is None:
            return None
        if type(row[1]) is not str:
            raise ValueError("Text title required")
        return Document(row[1], lambda: self._read_body(document_id))

    def _read_body(self, document_id):
        self._check()
        row = self._db.execute(
            "SELECT body FROM documents WHERE id = ?", (document_id,)
        ).fetchone()
        if row is None:
            raise LookupError("Document disappeared")
        value = row[0]
        if value is not None and type(value) is not str:
            raise ValueError("Text or NULL body required")
        return value
```

**demo.py — observe the timing and lifetime of reads**

```python
import sqlite3
from contextlib import closing
from documents import DocumentReader


with closing(sqlite3.connect(":memory:", isolation_level=None)) as db:
    db.execute("CREATE TABLE documents (id INTEGER PRIMARY KEY, title TEXT, body TEXT)")
    db.executemany("INSERT INTO documents VALUES (?, ?, ?)", [
        (1, "Quarterly summary", "Original detail"),
        (2, "Unopened report", ""),
    ])
    reads = []
    db.set_trace_callback(lambda sql: reads.append(sql) if sql.startswith("SELECT body ") else None)
    with DocumentReader(db) as reader:
        document = reader.get(1)
        unopened = reader.get(2)
        print("title:", document.title)
        print("body SELECTs before access:", len(reads))
        db.execute("UPDATE documents SET body = 'Revised detail' WHERE id = 1")
        print("first body:", document.body)
        print("again:", document.body)
        print("body SELECTs after access:", len(reads))
    print("loaded after exit:", document.body)
    try:
        unopened.body
    except RuntimeError:
        print("unloaded after exit: rejected")
# title: Quarterly summary
# body SELECTs before access: 0
# first body: Revised detail
# again: Revised detail
# body SELECTs after access: 1
# loaded after exit: Revised detail
# unloaded after exit: rejected
```

The counter measures body SELECT statements, not total database queries. Document 2 never loads its body. The direct update also demonstrates timing: the body can reflect a later state than the header. Python's [transaction-control documentation](https://docs.python.org/3/library/sqlite3.html#transaction-control-via-the-isolation-level-attribute) supports the explicit connection configuration; no multi-statement snapshot is established here.

## When to use it

Use Lazy Load when omitted data is costly and often unused, and the later access can tolerate latency and failure. Measure the actual access pattern.

If nearly every caller needs the data, a single eager read or a batch fetch is often simpler. For a read-only title list that never opens documents, a projection without a loader may suffice.

## Tradeoffs and common mistakes

**Hidden query multiplication.** One list query followed by one deferred query for each of N records produces N+1 queries. SQLAlchemy's [relationship-loading guide](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html#preventing-unwanted-lazy-loads-using-raiseload) describes eager loading and guards against unintended lazy access. Serialization or logging can unexpectedly cross the same boundary.

**Treating delay as consistency.** A deferred value may come from a later database state; a remembered value can subsequently become stale. Choose transaction isolation, refresh, and version policies separately. This example never invalidates a loaded body.

**Treating a loader as authorization.** Capturing an ID grants no access rights. A real application must enforce the relevant tenant and user policy for the deferred read, and decide whether cached data may still be returned after permissions change.

## Related patterns

[[proxy|Proxy]] controls access through a compatible subject interface. A virtual proxy can implement Lazy Load; lazy initialization of one field needs no separate proxy object.

[[data-mapper|Data Mapper]] reconstructs objects from stored representations and can install deferred loaders for omitted data.

[[identity-map|Identity Map]] controls which object represents an identity within a scope. Lazy Load controls when its data arrives; neither automatically supplies the other.

[[unit-of-work|Unit of Work]] coordinates persistence completion. Deferred reads must fit its chosen lifetime and consistency policy rather than accidentally outlive usable resources.

## Sources

Fowler's [Lazy Load](https://martinfowler.com/eaaCatalog/lazyLoad.html), in *Patterns of Enterprise Application Architecture*, establishes the pattern and its four variants. Official SQLAlchemy documentation linked above supports column deferral, loader lifetime, concurrency, and query-planning distinctions. Python documentation supports the SQLite configuration.

The document scenario, reader implementation, code, and illustrations are original teaching material.
