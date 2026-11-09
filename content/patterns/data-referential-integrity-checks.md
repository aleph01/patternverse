---
id: data-referential-integrity-checks
type: pattern
title: Referential Integrity Checks
summary: "Check that references resolve to the intended records using complete identities and the relevant historical or lifecycle rules."
status: published
aliases: []
tags:
  - data-engineering
  - quality-observability
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

Yesterday’s sales total was correct. Today, several orders have disappeared from the customer report. The orders still exist, but their customer IDs no longer match anything in the customer table. An inner join quietly removes them.

**Referential Integrity Checks verify that references resolve to records in the intended dataset.** An order points to an existing customer. An invoice line belongs to an existing invoice. A shipment references a known order line.

The purpose is to protect the connections that give records meaning. Individually valid tables can still form a broken model.

## Follow the complete identity

A reference makes a claim: “This record is connected to that record.”

Checking the claim requires more than finding the same number somewhere. Customer `29` in tenant A is different from customer `29` in tenant B. An identifier from one source system may collide with an unrelated identifier from another.

The check must use the complete identity: perhaps one surrogate key, perhaps a combination such as `(tenant_id, customer_id)`.

![Referential integrity checks comparing orders with customers. Order O1 references tenant A customer 17 and matches. Order O2 references tenant A customer 29 and remains unresolved even though tenant B customer 29 exists. Order O3 has a null customer, acceptable only when the relationship is optional.](../assets/data-engineering/referential-integrity-checks.svg "A/17 has a parent. A/29 does not, even though B/29 exists. The reference key includes its namespace. Null is permitted only where the relationship is explicitly optional and checks use an agreed source boundary.")

*An identifier without its namespace can produce a false match. A missing reference needs an explicit requiredness policy.*

For a required many-to-one relationship, three assertions normally belong together:

- The child contains a complete reference.
- The referenced key exists.
- That key identifies one parent record.

Existence and uniqueness are different checks. Finding a customer match does not reveal that two customer rows share the same key and would duplicate an order during a join.

Correctness also assumes compatible key representations and an agreed dataset boundary. Trimming identifiers, changing case, or removing leading zeros is safe only when those operations preserve identity.

## Example: protect invoice lines during writes

An invoicing application stores invoice headers separately from invoice lines. Every line must belong to an invoice.

In PostgreSQL, an enforced foreign key can maintain this relationship as data changes. Its referenced columns require an eligible uniqueness guarantee. If an application inserts a line for nonexistent invoice `I404`, the database rejects the operation. [PostgreSQL foreign keys](https://www.postgresql.org/docs/current/ddl-constraints.html)

Requiredness needs separate attention. For composite foreign keys, PostgreSQL’s default `MATCH SIMPLE` behavior exempts a reference from matching when any component is null. `MATCH FULL` permits an entirely null reference but rejects a mixture of null and non-null components. Required references need appropriate non-null constraints. [PostgreSQL foreign key matching](https://www.postgresql.org/docs/current/sql-createtable.html)

Deletion also expresses business policy. Restricting deletion preserves referenced parents; cascading deletion removes dependent children. Cascading may suit disposable components, but deleting a customer should not accidentally erase invoice history. [PostgreSQL referential actions](https://www.postgresql.org/docs/current/ddl-constraints.html)

For workflows that temporarily create related records out of order, PostgreSQL supports deferrable foreign keys checked at transaction end. The relationship must be valid before commit. Deferral does not permit an unresolved reference to persist indefinitely. [PostgreSQL constraint timing](https://www.postgresql.org/docs/current/sql-createtable.html)

A separate application lookup followed by an unprotected write offers a weaker guarantee: the parent may change between those operations.

## Example: detect orphaned orders in a warehouse

A warehouse receives orders and customers through independent pipelines. The destination does not enforce their relationship, so the pipeline checks it before publication.

For the diagram’s optional customer relationship, assume tenant IDs are required and independently validated:

```sql
SELECT o.order_id, o.tenant_id, o.customer_id
FROM candidate_orders AS o
WHERE o.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM candidate_customers AS c
    WHERE c.tenant_id = o.tenant_id
      AND c.customer_id = o.customer_id
  );
```

The query returns references with no matching parent. Order `O2` fails because `(A, 29)` is absent; customer `(B, 29)` cannot satisfy it.

If every order requires a customer, add a requiredness check. The query deliberately excludes null customer IDs rather than deciding their business meaning implicitly.

dbt’s built-in `relationships` test implements this family of checks for a referenced field. It excludes null values, so required references need an accompanying `not_null` test. Composite relationships require a test that compares the complete key, such as the assertion above. [dbt relationships test](https://docs.getdbt.com/reference/resource-properties/data-tests#relationships)

Do not infer enforcement from a declaration. BigQuery supports primary and foreign key constraints without enforcing them. Its optimizer can use those declarations, and Google warns that queries over data violating them may return incorrect results. A declared relationship is therefore a promise the pipeline must maintain. [BigQuery key constraints](https://docs.cloud.google.com/bigquery/docs/primary-foreign-keys)

A publication gate must check the exact candidate versions consumers will receive. Testing today’s orders against an unrelated customer snapshot can produce a misleading verdict.

## Example: the customer has not arrived yet

At 10:02, a sale arrives referencing customer `C91`. The customer feed has processed changes only through 09:58. C91 was created at 10:00.

The reference is unresolved in the warehouse. That does not establish that it is invalid at the source.

One response is to hold the sale until the customer feed catches up. Another is to publish with an explicitly unresolved relationship if consumers accept that contract. A dimensional warehouse may instead create an inferred member that preserves the customer identity while its descriptive attributes remain unknown.

The Kimball Group describes this approach for late-arriving dimensions: create a placeholder carrying the unresolved natural key, then update its descriptive attributes when the context arrives. [Kimball’s late-arriving dimension technique](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/late-arriving-dimension/)

The placeholder restores a physical relationship; enrichment remains incomplete. Track unresolved members separately, including their age and eventual resolution.

Mapping every failure to one generic “unknown customer” can preserve totals while concealing a broken feed. Preserve the original source reference so later repair remains possible.

Waiting also needs an owner and an escalation boundary. “Probably late” should not become permanent acceptance.

## Match the right population and time

Referential checks can report false failures when child data is ahead of parent data. They can report false success when stale parent records remain after they should have been removed.

Use a consistent snapshot where available, or define compatible source positions and completeness conditions. An arbitrary delay does not demonstrate that the required records have arrived.

Parent eligibility must follow the relationship’s meaning. Filtering customers to “currently active” may incorrectly reject historical orders belonging to inactive customers. Retention policies must likewise account for references from retained history.

Historical models may require more than existence. Finding a customer version somewhere in a dimension table does not establish that it was valid when the sale occurred. Check the referenced version or relevant effective interval when that is part of the contract.

The direction of the assertion matters too. “Every line belongs to an invoice” does not imply “every invoice has a line.” Minimum child counts require a separate rule.

## Choose enforcement, gating, or observation

A database constraint can prevent a violating mutation within its supported scope. A warehouse assertion observes a dataset at check time. An alert after publication detects damage already exposed.

To prevent exposure, keep candidates private and make publication depend on successful validation. Preserve failing identities, child records, rule version, and dataset versions so the result can be reproduced.

Reject, hold, or quarantine according to the delivery contract. Silently dropping unmatched orders makes the relationship appear clean by removing the evidence—and potentially the revenue.

## Costs and limits

These checks are especially useful after migrations, independent ingestion, key remapping, dimension loading, and retention changes.

Native constraints add write-time work and coordination around related changes. Warehouse assertions consume scans, joins, and execution capacity. Checking only changed children saves work, but parent deletions and key changes can invalidate older children.

Incremental checking therefore needs changes from both sides. Periodic broader audits help detect missed dependencies.

Measure affected records as well as distinct missing keys. One missing customer may disconnect thousands of orders. Segment results by source, tenant, and relationship so a healthy majority cannot hide a concentrated failure.

A successful check establishes that the tested reference resolves under the chosen matching rule. It does not establish that the application selected the correct customer, that the customer’s attributes are accurate, or that all expected records arrived.

**Namespace Identifiers** prevents collisions before matching. [[data-inferred-dimension-members|Inferred Dimension Members]] handles delayed descriptive context. [[data-as-of-joins|As-of Joins]] adds historical validity. [[data-atomic-publication|Atomic Publication]] exposes the coherent dataset versions that passed the checks.
