---
id: data-business-invariant-checks
type: pattern
title: Business Invariant Checks
summary: "Check relationships that must hold in the business, such as balanced amounts or valid lifecycle transitions, to catch errors that structural validation misses."
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

An order contains ten units. The warehouse reports seven shipped, customer service reports two cancelled, and the order system still shows two open. Every field has an acceptable type. Every quantity is positive. Together, they describe eleven units belonging to a ten-unit order.

**Business Invariant Checks verify relationships that must hold for a defined business state.** They test whether quantities balance, completed work has completion evidence, reservations remain within capacity, or allocations account for an agreed total.

Their purpose is to expose impossible states—and, when placed inside the right control boundary, prevent those states from becoming authoritative.

## Make the business relationship executable

An invariant translates a business rule into an assertion over data.

For a retailer that prohibits over-shipment, an order-line rule might be:

**Ordered quantity = shipped quantity + cancelled quantity + open quantity**

The equation is useful because individually plausible values can still contradict one another. It examines their relationship.

But the equation is not universally correct. Its categories must be mutually exclusive and collectively exhaustive. All quantities must use the same unit. Returns, replacements, substitutions, and amendments need an explicit treatment.

![Business invariant checks comparing a balanced published order line with an unbalanced candidate. Published revision R42 contains ten ordered units divided into six shipped, two cancelled, and two open. Candidate R43 totals eleven units and is held before publication.](../assets/data-engineering/business-invariant-checks.svg "For an order of ten units, shipped six plus cancelled two plus open two reconciles to ten. A candidate with seven shipped plus two cancelled plus two open violates the rule and is held.")

*The relationship reveals the defect. Holding publication gives the check an operational consequence.*

An invariant also differs from a statistical expectation. “Sales usually change by less than 20%” can be violated by a successful promotion. “Every allocated unit belongs to exactly one allocation category” expresses a condition the model requires.

## State where and when the rule applies

A useful invariant has a scope, an applicability condition, and a decision boundary.

For the order equation, that might mean one record per order line, quantities measured in individual items, and a coherent source boundary through which all relevant updates have arrived.

Timing matters. If the shipment feed advances before the open-quantity feed, their temporary disagreement may reflect an incomplete projection rather than an invalid business transaction. The check needs evidence that its inputs are ready.

Its placement determines what it can accomplish:

- **At mutation:** reject a change before it commits.
- **Before publication:** hold a candidate dataset until its checks pass.
- **After publication:** detect an existing violation and initiate investigation.

A nightly query can reveal overselling. It cannot prevent the reservations that caused it.

Each rule should have an owner, an explanation, and explicit exceptions. Version changes to the rule so historical outcomes remain interpretable.

## Example: completed work needs completion evidence

A service operation contains `status`, `started_at`, and `completed_at`.

For this business, a completed operation must have both timestamps, and completion cannot precede its start. Pending operations may legitimately lack a completion timestamp.

A blanket “no nulls” rule would reject valid pending work. A timestamp comparison alone could overlook completed work whose timestamps are missing.

Because the required evidence lives in one row, this rule can be enforced with a database constraint. PostgreSQL supports cross-field `CHECK` expressions. However, a check succeeds when its expression evaluates to true **or null**, so conditional requiredness must be handled explicitly. [PostgreSQL constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html)

The rule also assumes comparable clocks. If different systems record start and completion times, define their time basis and any justified tolerance. An unexplained negative duration should not be hidden behind an arbitrary allowance.

A row check establishes consistency among recorded fields. It does not establish that the operation happened.

## Example: concurrent reservations must preserve capacity

A stock row contains ten available units. Two requests arrive together: one reserves seven units; the other reserves six.

If both read ten, check their quantities independently, and then write, both can appear valid. Correctness requires coordinating the decision with the mutation.

For a single PostgreSQL stock row, a conditional update can express that boundary:

```sql
UPDATE stock
SET available = available - :requested
WHERE sku = :sku
  AND :requested > 0
  AND available >= :requested
RETURNING available;
```

Assume `sku` uniquely identifies the row, availability is non-null and nonnegative, and quantities use the same unit. The application must inspect whether a row was returned.

Under PostgreSQL’s Read Committed behavior, a competing updater waits for the first transaction and then re-evaluates its condition against the updated row. If seven units were reserved first, three remain; the six-unit request updates nothing. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

Create the reservation record in the same transaction as the decrement. Otherwise, failure between those operations can leave capacity and reservations inconsistent. Retried requests also need an identity that prevents duplicate reservations.

Every competing reservation must follow the protocol. A separate writer that bypasses it can break the guarantee. Rules spanning several stock rows require a broader concurrency strategy; the single-row mechanism does not automatically protect a cross-row total.

## Example: order quantities must balance before publication

Return to the ten-unit order. A reporting pipeline builds this candidate:

| Order | Line | Ordered | Shipped | Cancelled | Open |
|---|---:|---:|---:|---:|---:|
| O17 | 1 | 10 | 7 | 2 | 2 |

Assume requiredness and nonnegative quantities are already checked. The business assertion can select violations:

```sql
SELECT order_id, line_id
FROM candidate_order_balance
WHERE shipped_qty + cancelled_qty + open_qty <> ordered_qty;
```

This query returns O17’s line because its categories total eleven.

dbt data tests use this mechanism: a test query selects failing records, and an empty result passes. Custom tests can express business assertions beyond standard null, uniqueness, and relationship checks. [dbt data tests](https://docs.getdbt.com/docs/build/data-tests)

The pipeline must validate the **exact candidate version it will publish**. Checking candidate A and then publishing candidate B provides no guarantee about B.

Keep the candidate private while validation runs. On failure, preserve the previous published version and retain the violating records for investigation.

Dagster provides a concrete orchestration mechanism: asset checks normally allow downstream materialization to continue, while its documented `blocking=True` configuration can stop downstream materialization on failure. That does not undo the asset already materialized. Exposure therefore belongs in a downstream publication step that is actually gated. [Dagster blocking asset checks](https://dagster.io/docs/guides/test/asset-checks#blocking-downstream-materialization)

If the input feeds have not reached their agreed boundary, classify the result as pending rather than treating incomplete evidence as either a confirmed failure or a pass.

## Avoid checks that manufacture reassurance

An assertion returning no violations can still be misleading.

An empty dataset passes many checks vacuously. An inner join may remove unmatched records before the invariant sees them. Missing order lines never enter a row-level comparison. Calculating both sides of an equation from the same expression creates a permanent, meaningless success.

Pair invariants with completeness and coverage checks. Preserve unmatched records when they could represent violations. Handle nulls deliberately: ordinary SQL comparisons can evaluate to unknown and disappear from a failing-row query.

Precision needs similar care. Use exact representations where exact equality is required. If rounding differences are permitted, specify the unit, rounding stage, and tolerance.

Also respect the enforcement mechanism’s scope. PostgreSQL explicitly does not support `CHECK` constraints that depend on other rows or tables. A cross-table business balance needs an appropriate transactional protocol or dataset assertion rather than a row constraint disguised as a global guarantee. [PostgreSQL cross-row constraint limitations](https://www.postgresql.org/docs/current/ddl-constraints.html)

## Pay for the guarantee you need

Business invariants are especially useful for inventory, allocation, lifecycle transitions, reconciliation, and publication of trusted analytical datasets.

Their operating costs vary. Row checks are local. Cross-table balances can require large scans and joins. Transactional enforcement can introduce contention. Publication gates can delay delivery while a small affected population is investigated.

Checking changed keys reduces work, but the affected set must include deletions and changes on every side of the relationship. Periodic broader audits help detect gaps. Sampling can support investigation; it does not establish that a hard invariant holds everywhere.

Preserve failure evidence: entity identity, observed values, rule version, source boundary, and candidate version. Re-running against changing data may otherwise produce a different answer.

Do not force values to balance automatically or drop failing records to obtain a clean report. Those actions can conceal the process defect and remove legitimate business activity.

## Connect the rule to a response

[[data-schema-validation-boundaries|Schema Validation at Boundaries]] establishes the fields and types on which an assertion depends. [[data-declare-the-grain|Declare the Grain]] defines what one checked record represents. [[data-atomic-publication|Atomic Publication]] exposes a coherent candidate that passed validation. [[data-compensating-actions|Compensating Actions]] addresses violations whose effects have already escaped.

A successful invariant check establishes a stated relationship over the evidence examined. Its value comes from making that relationship precise—and connecting failure to an effective response.
