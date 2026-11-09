---
id: data-materialized-views
type: pattern
title: Materialized View
summary: "Store a query’s derived result for reuse, with explicit maintenance and freshness rules that keep consumers aware of when the stored answer is valid."
status: published
aliases:
  - Materialized Views
tags:
  - data-engineering
  - storage-access
  - software-engineering
  - performance-and-scalability
verses:
  - software-engineering
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

## Purpose and problem

A dashboard refreshes every few seconds. Each refresh joins the same tables, groups the same sales, and reconstructs nearly identical totals. As more users arrive, repeated computation consumes capacity even when little source data has changed.

The team wants cheaper reads while preserving an authoritative sales record. Precomputing totals can help, but creates maintenance work: new sales, corrections, deletions, failed refreshes, and late arrivals must have defined consequences. A fast answer is useful only within its freshness contract.

## Core idea

**Materialized View stores derived data in a form suited to recurring queries and maintains it separately from those reads.** A conventional view stores a query definition; materialization also stores its result or sufficient intermediate state. Millions of transactions can become a small table grouped by shop and currency.

Think of a maintained read surface beside the source. Consumers read it; an engine, pipeline, or application component owns maintenance. Business changes belong in the source. The derived data should be rebuildable from retained source data and its defining logic.

“Materialized Views” is the plural name used by the existing catalog entry. The architectural pattern includes application-maintained projections, beyond database-native objects. It does not prescribe automatic incremental updates, immediate freshness, or optimizer query rewriting.

![Three sales for shop A total USD 100. After another USD 10 sale commits, the source contains four sales totaling USD 110 while generation 1 still contains three sales totaling USD 100. A successful refresh publishes generation 2 with four sales totaling USD 110.](../assets/data-engineering/materialized-views.svg "These are the example’s stored results. Publication changes only after maintenance commits. Amounts are integer USD cents in the program; a read does not itself refresh the materialization.")

## How it works

### Define the result and its maintenance contract

Specify grain, units, filters, joins, and grouping keys. Shop totals in different currencies must remain separate. An aggregate cannot repair an incorrect join or double-counted ingestion.

A full refresh reruns the defining query. Incremental maintenance applies changes to stored state. Updates and deletions require removing old contributions, not just appending replacements. An average needs sum and count, or equivalent mergeable state; averaging unequal batches’ averages is wrong.

Historical backfill and ongoing changes need a shared boundary. Overlap can duplicate contributions; a gap can omit them. Across stores, a coherent source boundary requires an explicit protocol rather than an assumed universal transaction.

### Publish and observe deliberately

Readers should see a complete published result. Rebuild privately or use a suitable transaction; publish result data and its progress metadata together. A failed refresh should leave the previous complete result available where the chosen contract supports that behavior.

A publication generation identifies a result, not its age or source completeness. Monitor covered source progress, refresh duration, failures, and ingestion lag. A one-minute schedule is not a one-minute staleness guarantee. A refresh can finish successfully while an earlier event has not yet arrived.

Restrict writes to the maintainer and enforce consumer authorization. A derived copy can expose sensitive fields independently of the source’s access path. Rebuilds also need storage, temporary space, and an owner responsible for retiring obsolete versions.

## Worked example

### A refreshable sales summary

Before materialization, each dashboard request aggregates sales. Afterward, it reads a small stored summary. This Python 3.11+ program uses SQLite tables to implement the architectural pattern; it is not SQLite support for `CREATE MATERIALIZED VIEW`.

Save as `materialized_view.py` and run `python3 materialized_view.py`. Amounts are nonnegative integer cents; the example reports shop A in USD. The connection uses explicit transactions and must be idle on refresh entry. `BEGIN IMMEDIATE` serializes SQLite writers, keeping source aggregation and publication in one transaction. `closing` owns connection cleanup.

```python
from contextlib import closing
import sqlite3


def initialize(db):
    db.executescript("""
        CREATE TABLE sales (
            id INTEGER PRIMARY KEY, shop TEXT NOT NULL,
            currency TEXT NOT NULL,
            cents INTEGER NOT NULL CHECK (
                typeof(cents)='integer' AND cents>=0));
        CREATE TABLE shop_sales (
            shop TEXT NOT NULL, currency TEXT NOT NULL,
            sale_count INTEGER NOT NULL, total_cents INTEGER NOT NULL,
            PRIMARY KEY (shop, currency));
        CREATE TABLE publication (
            id INTEGER PRIMARY KEY CHECK (id=1),
            generation INTEGER NOT NULL);
        INSERT INTO publication VALUES (1, 0);
    """)


def refresh(db):
    if db.in_transaction:
        raise ValueError("refresh requires an idle connection")
    db.execute("BEGIN IMMEDIATE")
    with db:
        db.execute("DELETE FROM shop_sales")
        db.execute("""INSERT INTO shop_sales
            SELECT shop, currency, COUNT(*), SUM(cents)
            FROM sales GROUP BY shop, currency""")
        db.execute("""UPDATE publication
            SET generation=generation+1 WHERE id=1""")


def report(db, shop="A", currency="USD"):
    row = db.execute("""SELECT p.generation,
        COALESCE(s.sale_count, 0), COALESCE(s.total_cents, 0)
        FROM publication p LEFT JOIN shop_sales s
        ON s.shop=? AND s.currency=? WHERE p.id=1""",
        (shop, currency)).fetchone()
    if row[0] == 0:
        raise LookupError("not refreshed")
    return row


if __name__ == "__main__":
    with closing(sqlite3.connect(":memory:", isolation_level=None)) as db:
        initialize(db)
        db.executemany("INSERT INTO sales VALUES (?, 'A', 'USD', ?)",
                       [(1, 5000), (2, 3000), (3, 2000)])
        refresh(db)
        print("initial", report(db))
        db.execute("INSERT INTO sales VALUES (4, 'A', 'USD', 1000)")
        print("stale", report(db))
        refresh(db)
        print("refreshed", report(db))
        db.execute("UPDATE sales SET cents=4000 WHERE id=1")
        db.execute("DELETE FROM sales WHERE id=2")
        db.execute("""CREATE TRIGGER fail_publication
            AFTER UPDATE ON publication BEGIN
            SELECT RAISE(ABORT, 'refresh failed'); END""")
        try:
            refresh(db)
        except sqlite3.IntegrityError:
            print("failed", report(db))
        db.execute("DROP TRIGGER fail_publication")
        refresh(db)
        print("recovered", report(db))
```

The five lines are `initial (1, 3, 10000)`, `stale (1, 3, 10000)`, `refreshed (2, 4, 11000)`, `failed (2, 4, 11000)`, and `recovered (3, 3, 7000)`. Tuples mean generation, sale count, and USD cents. The correction removes 1000 cents and deletion removes 3000, so 11000 becomes 7000.

The deliberate trigger aborts after the publication update; rollback restores both the old summary and generation. Retrying a full refresh recomputes rather than adding the same sales again. An empty refreshed group reports zero; generation zero means no refresh has succeeded. SQL errors propagate rather than becoming empty sales.

![A full refresh starts from published generation 2 with four sales totaling 11000 cents. Rebuilding after source corrections would publish generation 3 with three sales totaling 7000 cents. An injected publication failure rolls back to generation 2; a successful retry publishes generation 3 and the corrected result together.](../assets/data-engineering/materialized-view-refresh.svg "The transaction is the publication boundary in this SQLite example. Generation and summary commit together. Existing read transactions may retain an older snapshot; no distributed snapshot or freshness deadline is supplied.")

This example has no scheduler, change stream, incremental updater, source watermark, authentication, or cross-store coordination. Its writer lock is an explicit cost; it does not reproduce PostgreSQL’s concurrent-refresh implementation.

### Engine-specific maintenance

PostgreSQL stores the defining query and refreshes its contents. `REFRESH MATERIALIZED VIEW CONCURRENTLY` preserves concurrent selects, requires a populated view and unique index on columns covering all rows, and permits only one refresh per view at a time. It is not incremental computation.

ClickHouse incremental views process inserted blocks into target tables. Readers must combine partial aggregates correctly; right-side join changes do not trigger retroactive repair. Refreshable views can instead rerun the full query and atomically replace results.

Eligible BigQuery materialized views can combine stored results with newer base data and support optimizer rewriting. Updates, deletions, or right-side join changes can disable incremental use and force query fallback. Correct results can therefore become slower without becoming incorrect. Explicit staleness settings define a different contract.

## When to use it

Use materialization when many queries reuse expensive joins, filters, or aggregates and maintenance costs less than repeated computation. Stable dashboards and shared read projections are recognizable cases.

Keep direct queries or ordinary views when indexes already meet the budget, reads rarely repeat, or freshness requirements make maintenance impractical. Do not materialize every slight dashboard variation by default.

## Tradeoffs and common mistakes

Costs move into storage, refresh scans, write-time work, temporary rebuild space, monitoring, and schema evolution. Several views can multiply ingestion work. Measure end-to-end workload cost, reader latency, refresh failures, and fallback frequency.

Common mistakes include assuming every mutation is maintained automatically, treating two independently refreshed views as one coherent snapshot, and confusing successful publication with complete ingestion. Preserve rebuildable source history and test correction, deletion, duplicate delivery, and recovery paths.

## Related patterns

[[cqrs|CQRS]] separates command and query models. A materialized view can implement its read model; either pattern can also be used independently.

[[data-result-caching|Result Caching]] reuses computed query answers under validity rules. A materialized view maintains a reusable derived relation or projection beyond one response.

[[data-atomic-publication|Atomic Publication]] prevents consumers from observing a partially rebuilt result.

[[data-freshness-monitoring|Freshness Monitoring]] checks whether published data covers enough source progress to remain useful.

## Sources

- [Microsoft: Materialized View](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view) — architectural projection, ownership, rebuildability, and maintenance tradeoffs.
- PostgreSQL: [Materialized views](https://www.postgresql.org/docs/current/rules-materializedviews.html) and [REFRESH MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html) — native storage, refresh, and concurrency requirements.
- ClickHouse: [Incremental](https://clickhouse.com/docs/concepts/features/materialized-views/incremental-materialized-view) and [refreshable materialized views](https://clickhouse.com/docs/concepts/features/materialized-views/refreshable-materialized-view) — insert blocks, joins, and full replacement.
- BigQuery: [Introduction](https://docs.cloud.google.com/bigquery/docs/materialized-views-intro) and [using materialized views](https://docs.cloud.google.com/bigquery/docs/materialized-views-use) — query rewriting, incremental eligibility, fallback, and staleness.
- SQLite: [Isolation](https://www.sqlite.org/isolation.html) and [trigger RAISE](https://www.sqlite.org/lang_createtrigger.html#the_raise_function); [Python sqlite3](https://docs.python.org/3/library/sqlite3.html) — actual transaction, failure, and connection-lifecycle behavior.

The retained sales scenario, SQLite implementation, failure experiment, and diagrams are original teaching material.
