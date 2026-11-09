---
id: database-per-service
type: pattern
title: Database per Service
summary: Keep each service's persistent data private to its owner, exposing business contracts instead of allowing other services to depend on its tables.
status: published
aliases:
  - Database-per-Service
tags:
  - software-engineering
  - persistence
  - service-boundaries
verses:
  - software-engineering
attribution: Chris Richardson, Microservices.io architecture patterns; implementation context from Microsoft and PostgreSQL documentation. Original Patternverse SQL example and illustrations.
---

## Purpose and problem

Orders and Inventory are separately deployed services, but Orders queries Inventory's stock table directly. When Inventory changes its storage model, both teams must coordinate releases. Giving Orders a separate deployment has preserved a database-level dependency on Inventory's implementation.

Shared writes are worse: callers can bypass Inventory's business rules. Yet separating access also removes convenient joins and local transactions across both capabilities. The design needs a clear data owner and deliberate ways to cooperate without quietly recreating the shared database.

## Core idea

**Database per Service** keeps a service's persistent state private and accessible to other services through its published contracts. Database-per-Service is the same name with different punctuation. Private tables, private schemas, and separate database servers are implementation choices—not interchangeable names for mandatory physical isolation.

The mental model is **one owner of authoritative state, many deliberate consumers**. A service can publish facts or answer requests; consumers must not treat its internal tables as a shared integration interface. An independently maintained projection can contain copied facts without becoming their authoritative source.

![Orders and Inventory use separate runtime roles and each issues SQL only to its own private schema. The two schemas share one PostgreSQL server. An inter-service API request connects the services above the storage boundary, rather than granting Orders direct access to Inventory tables.](../assets/software-engineering/database-per-service-ownership.svg "Logical ownership can share physical hosting. The conceptual API arrow is not implemented by the SQL example, which demonstrates runtime storage privileges.")

## How it works

### Own the contract and the storage lifecycle

The owning team controls schema migrations, indexes, data repair, retention, and compatibility of its API or events. Other teams depend on that contract. Internal storage can then change without coordinating every reader, provided published behavior remains compatible.

Enforce the boundary with service-specific credentials and database privileges. Separate schema names alone do not prevent cross-service reads or writes. Keep runtime access distinct from migration ownership; broad shared credentials defeat the design. Permissions must also account for inherited roles, public grants, and privileged routines. These are storage-access controls, not a replacement for business authorization inside the service.

A shared server still shares operational risks: resource contention, maintenance, capacity, and failures. Separate servers may reduce some coupling, but introduce more provisioning, backups, upgrades, and recovery procedures. Choose that physical boundary for concrete operational needs.

### Replace implicit joins and transactions with explicit decisions

A query spanning owners can compose API responses or read a separately maintained projection. Composition has latency and partial-failure costs. A projection needs a freshness contract, propagation, and correction handling; it is not a synchronous view into another service's transaction.

Each owner controls its local transaction. A multi-service workflow needs its own pending states, retries, reconciliation, or compensation. Database per Service does not supply these automatically or universally prohibit every distributed-transaction technology. If an invariant repeatedly demands one atomic change across two owners, reconsider the boundary before adding coordination machinery.

For change events, recording publication intent with local data avoids a database-commit/message-send gap. Consumers must tolerate duplicate or delayed delivery. Retaining the same identifier across services supports association, but does not create a cross-service foreign key or an atomic snapshot.

![Inventory commits a two-unit local adjustment, leaving three available units. A later Orders transaction rejects an order with zero requested units, leaving no order row. Inventory remains at three. Direct cross-service SQL is denied; a real workflow must resolve partial progress through a service contract and explicit recovery.](../assets/software-engineering/database-per-service-commits.svg "Private stores give each service a local commit boundary. The deliberate rejection exposes partial progress; this is a permissions and transaction demonstration, not a checkout workflow.")

## Worked example

### Private schemas on one PostgreSQL server

Save `setup.sql` and `demo.sql`. Run each once, in that order, using a provisioning administrator and `psql -X -v ON_ERROR_STOP=1 -f setup.sql`, then the equivalent command for `demo.sql`. Use a **fresh, isolated PostgreSQL 15+ cluster**: role names are cluster-wide, and this setup is not an existing-database migration.

`setup.sql` creates distinct owner and runtime roles. The roles are deliberately `NOLOGIN`; `SET ROLE` exercises their database permissions from the administrator session. Production services need separately authenticated principals with only their intended runtime role, not this administrator session. Tables use explicit schema qualification.

```sql
CREATE ROLE orders_owner NOLOGIN;
CREATE ROLE inventory_owner NOLOGIN;
CREATE ROLE orders_app NOLOGIN;
CREATE ROLE inventory_app NOLOGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA orders AUTHORIZATION orders_owner;
CREATE SCHEMA inventory AUTHORIZATION inventory_owner;
REVOKE ALL ON SCHEMA orders, inventory FROM PUBLIC;

SET ROLE inventory_owner;
CREATE TABLE inventory.stock (
    sku text PRIMARY KEY,
    available_units integer NOT NULL CHECK (available_units >= 0)
);
INSERT INTO inventory.stock VALUES ('MUG', 5);
GRANT USAGE ON SCHEMA inventory TO inventory_app;
GRANT SELECT ON inventory.stock TO inventory_app;
GRANT UPDATE (available_units) ON inventory.stock TO inventory_app;
RESET ROLE;

SET ROLE orders_owner;
CREATE TABLE orders.orders (
    order_id text PRIMARY KEY,
    sku text NOT NULL,
    requested_units integer NOT NULL CHECK (requested_units > 0)
);
GRANT USAGE ON SCHEMA orders TO orders_app;
GRANT SELECT, INSERT ON orders.orders TO orders_app;
RESET ROLE;
```

`demo.sql` performs two independent local transactions. Inventory starts with five physical units and commits an adjustment of two. Orders then deliberately attempts an invalid zero-unit order. The exception blocks accept only the expected failure; unexpected success raises an error.

```sql
BEGIN;
SET LOCAL ROLE inventory_app;
UPDATE inventory.stock SET available_units = available_units - 2
WHERE sku = 'MUG' AND available_units >= 2
RETURNING sku, available_units;
COMMIT;

BEGIN;
SET LOCAL ROLE orders_app;
DO $$
BEGIN
    INSERT INTO orders.orders VALUES ('O42', 'MUG', 0);
    RAISE EXCEPTION 'Unexpected acceptance of zero units';
EXCEPTION WHEN check_violation THEN
    NULL;
END $$;
SELECT COUNT(*) AS orders_written FROM orders.orders;
DO $$
BEGIN
    PERFORM available_units FROM inventory.stock WHERE sku = 'MUG';
    RAISE EXCEPTION 'Unexpected direct Inventory access';
EXCEPTION WHEN insufficient_privilege THEN
    NULL;
END $$;
SELECT 'Orders direct read denied' AS verified_boundary;
COMMIT;

BEGIN;
SET LOCAL ROLE inventory_app;
DO $$
BEGIN
    UPDATE orders.orders SET requested_units = 2 WHERE order_id = 'O42';
    RAISE EXCEPTION 'Unexpected direct Orders access';
EXCEPTION WHEN insufficient_privilege THEN
    NULL;
END $$;
SELECT 'Inventory direct write denied' AS verified_boundary;
COMMIT;
```

The result sets show `MUG | 3`, `orders_written = 0`, and the two verified-denial messages. Inventory's committed value remains three; rejecting the Orders insert does not undo it. No cross-service foreign key is declared: `sku` is a contract identifier, not permission to query the other table.

The example enforces ordinary runtime privileges and local constraints. It implements no API, network, reservation lifecycle, retry protocol, authentication setup, or recovery workflow. The administrator can still bypass these boundaries; services must never run with that authority. Future objects need appropriate grants, and production migrations need compatibility and rollback planning.

## When to use it

Use this pattern when service teams need independent storage evolution, explicit authority over business state, or different persistence technologies. Direct reads from another service's tables and release coordination around shared columns are recognizable warning signs.

A small application with one owner and coherent transactions may be better served by a modular monolith. Splitting its data solely to imitate a microservices diagram creates coordination costs without necessarily providing useful independence.

## Tradeoffs and common mistakes

Private data makes some reporting and workflows harder. Budget for contract evolution, tracing, copied-data reconciliation, and recovery from partial completion. A read-only grant into another service's private tables still couples the reader to storage structure; a renamed database does not solve that.

Do not create one database per entity or table without a capability boundary. Do not assume that separate stores guarantee privacy, availability, or consistent backups across services. A restored projection may need rebuilding, and cross-service references may require reconciliation after recovery. Shared libraries that expose private database models can also reintroduce the coupling the boundary was meant to remove.

## Related patterns

- [[microservices|Microservices]] establishes independently deployable capability owners. Database per Service specifies their persistence boundary.
- [[data-bounded-contexts|Bounded Context]] defines coherent model meanings. Ownership should reflect these meanings rather than arbitrary table counts.
- [[data-transactional-outbox|Transactional Outbox]] couples a local state change with publication intent, without making downstream effects part of that same transaction.
- [[data-materialized-views|Materialized Views]] stores derived answers. A consumer-owned cross-service projection adds an integration and freshness contract to that idea.

## Sources

- [Richardson: Database per Service](https://microservices.io/patterns/data/database-per-service.html) establishes private storage, implementation variants, enforcement, and cross-service coordination costs.
- [Microsoft: Data considerations for microservices](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/data-considerations) explains ownership, shared physical hosting, replicated facts, and consistency choices.
- PostgreSQL: [Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html), [Privileges](https://www.postgresql.org/docs/current/ddl-priv.html), [GRANT](https://www.postgresql.org/docs/current/sql-grant.html), and [SET ROLE](https://www.postgresql.org/docs/current/sql-set-role.html) support the executable boundaries.

The SQL fixtures, deliberate rejection, and illustrations are original teaching material. They test data ownership on shared hosting, not a production service deployment.
