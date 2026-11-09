---
id: data-sensitive-data-segregation
type: pattern
title: Sensitive-Data Segregation
summary: "Place sensitive details behind separately controlled storage or access boundaries, allowing ordinary workflows to use less-sensitive data without receiving the protected fields."
status: published
aliases: []
tags:
  - data-engineering
  - ownership-lifecycle
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A sales dashboard needs order dates, product categories, and amounts. Its source table also contains customer email addresses, delivery instructions, and identity documents. Because everything arrives together, the reporting pipeline copies everything together.

Soon a routine analytics account can read information that none of its reports require. Development extracts, troubleshooting files, and backups inherit the same exposure.

**Sensitive-data segregation separates information with different protection requirements into independently controlled stores or interfaces.** Ordinary work proceeds with the fields it needs. Access to more sensitive information follows a narrower, explicit path.

The purpose is to reduce how many systems, people, and processes handle sensitive values—and how much a failure in any one of them can expose.

## Make protection boundaries part of the model

A customer record may be convenient to retrieve as one object while containing several different access needs:

| Information | Typical purpose | Potential access boundary |
|---|---|---|
| Customer reference, order amount | Sales analysis | Analytics dataset |
| Email, delivery address | Notifications and fulfillment | Restricted contact store |
| Identity documents | Verification | Verification service and protected storage |
| Connector credentials | Access to external systems | Secrets manager |

These boundaries should follow actual purposes and permissions. Putting every sensitive field into one enormous “private” table can still give a notification service unnecessary access to identity documents.

Separation can operate within one database through restricted tables or schemas. Stronger isolation may require different databases, projects, accounts, administrative roles, or services. Choose the boundary according to the failures it must contain.

**A different table name does not create a different security boundary.** The effective grants, service identities, administrative paths, and copied outputs must support the distinction. OWASP recommends separate application accounts with minimum permissions, including table, column, row, or restricted-view access where appropriate. [OWASP database security guidance](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)

![A trusted intake separates contact details from order measures. A restricted contact service can access email and address, while analytics receives customer references and order amounts. Exports, logs, backups, restores, and administrative access must preserve the boundary.](../assets/data-engineering/sensitive-data-segregation.svg "Contact data is stored in a restricted area while analytics uses a limited reference. An authorized notification workflow crosses the boundary for its defined purpose. General analytics readers do not get contact access.")

*The analytics store still requires protection: customer references and transaction histories can support linkage.*

## Example: sales analysis without contact details

A retailer initially publishes this record to its warehouse:

| Order | Customer | Amount | Email | Delivery address |
|---|---|---:|---|---|
| O91 | C17 | USD 100 | mira@example.test | 14 Example Lane |

The sales team needs the first three fields. A notification workflow needs the email address. Fulfillment needs the delivery address.

The retailer separates contact information from analytical order facts. Sales analysts receive order records containing `order_id`, `customer_ref`, currency, and amount. Their account cannot read the contact store or invoke a privileged function that returns contact details.

The notification service receives permission for its own workflow. Where practical, the interface accepts an order reference and sends the approved notification, rather than returning an arbitrary list of customer email addresses.

This is a deliberate restriction on what crosses the boundary. Rebuilding a wide customer table every night under a powerful pipeline account would undo much of the separation.

BigQuery provides verified implementation options for this design. Its documentation describes separate sensitive-data tables and authorized views that expose selected data while consumers lack direct access to the source dataset. An authorized view creates controlled logical access; it does not physically remove the underlying sensitive fields. [BigQuery authorized views and separate-table alternatives](https://docs.cloud.google.com/bigquery/docs/authorized-views)

## Example: workforce planning without payroll access

A company’s employee table combines department, employment status, salary, bank account, and accommodation notes. Workforce planners need headcounts and staffing changes. Payroll staff need salary and payment details. Accommodation information has another, narrower purpose.

A useful separation might provide:

- An employment dataset with employee reference, department, status, and effective dates.
- A restricted compensation dataset for payroll calculations.
- A separately controlled payment-details store.
- A case-management boundary for accommodation records.

The planner can count active employees without receiving bank accounts or case notes.

The remaining employment data is not automatically harmless. A single employee in a small department may be identifiable from role and dates alone. Published summaries may therefore need additional disclosure controls.

Separation also changes query design. A payroll calculation must deliberately combine authorized compensation and employment records at compatible effective dates. Joining every historical salary row to every department assignment can produce incorrect payments even when access controls are perfect.

The model must preserve both confidentiality and business meaning.

## Example: pipeline configuration without embedded secrets

A data platform keeps connector settings in a configuration table. Each row includes a source name, extraction schedule, destination, and database password. Engineers who only need to change a schedule can consequently retrieve production credentials.

Segregation moves the credential into a secrets manager. The configuration table retains a secret reference. The extraction worker uses its own identity to retrieve the specific secret required for that source; configuration readers cannot retrieve the value merely because they know its reference.

AWS Secrets Manager implements this arrangement through protected secret storage and IAM-controlled retrieval. Its guidance recommends least-privilege access and supports rotation and monitoring. [AWS Secrets Manager best practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)

The worker still handles the secret during execution. Its memory, diagnostic output, and caches become relevant protection points. Moving a password out of configuration does not make it safe to print the resolved value in a connection-error message.

## Preserve the boundary through the whole pipeline

Segregation requires control over every route by which sensitive values can leave the restricted area.

Raw ingestion deserves particular attention. If a source delivers mixed records, the landing area initially contains the sensitive fields. Any retained originals need appropriate restrictions before a downstream transformation separates them. A broad raw-data reader can otherwise bypass the carefully designed analytical model.

The same reasoning applies to failed records, temporary tables, exports, replicas, and restores. A restricted primary database alongside a widely readable backup provides an alternate access path.

Logs need useful evidence without becoming another sensitive-data store. Record the operation, actor, result, and an appropriate reference rather than routinely copying entire payloads. OWASP identifies passwords, access tokens, sensitive personal data, and payment information among the values that usually should not be recorded directly. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

Protection also needs to survive authorized transformations. BigQuery, for example, does not automatically attach source policy tags to tables created from query results or to exported data. Its documented table-copy behavior differs. A privileged job’s destination therefore needs explicit consideration. [BigQuery policy-tag propagation rules](https://docs.cloud.google.com/bigquery/docs/column-level-security#faqs)

## Keep the separated records correct

Splitting a record introduces relationships that must remain dependable.

The joining reference needs a defined namespace and uniqueness rule. The model must distinguish a current contact address from an address captured for a historical delivery. Consumers need to know whether a missing restricted record means “not supplied,” “not yet processed,” or “unavailable to this caller.”

Within one transactional database, related writes may commit together. Across separate services or stores, updates can arrive at different times. The design needs an explicit consistency arrangement and reconciliation so partial writes do not silently produce orphaned records or incorrect joins.

Failures must preserve the protection boundary. If the restricted contact service is unavailable, a sales report should normally continue without contact fields. A notification workflow may need to retry. Falling back to an unrestricted export would defeat the design.

Verification should use the actual consumer identities. Test that routine queries work, forbidden reads fail, and newly added fields do not flow into ordinary outputs without review.

## The costs and limits of separation

Segregation adds schemas, permissions, interfaces, deployment coordination, and operational ownership. Separate services introduce latency and availability dependencies. Separate databases can complicate transactions, joins, backup coordination, and deletion workflows.

It is especially useful when a relatively small set of fields requires much narrower access than the surrounding business data, or when different information needs different retention, administrative, or operational controls.

It helps less when nearly every legitimate operation requires all the separated fields. In that situation, a carefully controlled table or interface may be simpler. Excessive fragmentation can encourage teams to create uncontrolled local copies.

Separation also does not establish anonymity. Stable references and detailed behavior can remain identifying. Encryption complements segregation, while access controls determine who can obtain usable values. Neither removes the need to consider what authorized outputs reveal.

## Related patterns

[[data-vertical-partitioning|Vertical Partitioning]] also splits fields into separate structures. Sensitive-data segregation chooses the split around protection requirements and effective access.

[[data-tokenization|Tokenization]] can replace identifying join values with controlled substitutes, reducing the spread of originals across the separated stores.

[[data-row-and-column-level-access|Row- and Column-Level Access]] provides finer restrictions within a store and can complement broader segregation boundaries.

[[data-dynamic-masking|Dynamic Masking]] changes the values a caller sees at query time. Segregation reduces where sensitive originals are stored and which processing paths can reach them.
