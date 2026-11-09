---
id: data-access-audit-trails
type: pattern
title: Access Audit Trails
summary: "Connect who requested data, what was authorized, and what access actually occurred, preserving enough evidence to investigate activity across systems."
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

A customer asks who viewed their contact details last Tuesday. The database log names `svc_support`, an account used by the entire support application. The application log says a page loaded, but contains no customer reference. The two records cannot be reliably connected.

There are logs, but they do not answer the question.

**Access audit trails preserve connected evidence of attempts to use data: the authenticated identity, requested resource, operation, authorization decision, and observable outcome.** They make access investigable across application, database, and storage boundaries.

The purpose is accountability. An audit trail should support a precise reconstruction of what the system recorded, while making its gaps and limits visible.

## Record an access, not merely an activity

“User logged in” establishes a session. “Query completed” establishes a database operation. Neither alone identifies which customer’s details an application returned through that session.

A useful access record connects several facts:

| Evidence | What it helps establish |
|---|---|
| Event identifier and timestamp | Which event occurred, and when |
| Authenticated actor and effective principal | Who initiated the action and which credentials executed it |
| Resource and requested operation | What data or interface was targeted |
| Authorization decision and policy context | Whether access was permitted under the recorded conditions |
| Execution and response outcome | Whether processing succeeded and what the interface reports delivering |
| Request, query, job, or session references | How evidence connects across systems |

Event time and collection time should remain distinct. A delayed log shipment should not make yesterday’s access appear to have happened today.

The record’s meaning also needs boundaries. A successful authorization is not proof that a query ran. A completed query is not proof that a person read the screen. A statement that accessed a column does not necessarily establish that its original values were returned.

![An authenticated support user’s request is linked to an application authorization record and a database operation executed by a service account. Correlated audit evidence preserves the person, resource, request, query, and outcomes without storing the customer’s email value.](../assets/data-engineering/access-audit-trails.svg "Mira requests R17/C17 through service support under query Q9. Trusted attribution links the user and service identity to the access event. A denied R18 request has no database access event. A log entry does not prove a human read or understood the result.")

*Each layer contributes evidence about the actions it can observe.*

## Example: connecting a support agent to a database read

Mira opens customer C17’s contact panel to handle support case S42.

The application authenticates Mira, checks her permission, and creates request R17. It runs database query Q9 using `svc_support`, then returns the permitted fields.

The connected evidence might look like this:

| Layer | Illustrative record |
|---|---|
| Application | Mira; C17; S42; R17; permitted; Q9; response completed |
| Database | `svc_support`; Q9; contact object; query completed |
| Correlation | R17 caused Q9 |

The database correctly identifies its caller as the service account. The application supplies the human attribution that the database cannot independently infer.

That attribution must come from trusted authentication and application context. A request parameter saying `user=Mira` is not equivalent evidence. Case S42 provides useful context only if the application validates the relationship; a typed explanation does not prove a legitimate purpose.

If Mira instead requests a restricted record and receives a denial, the application should record that attempt even though no database query follows.

A shared backend identity can therefore be compatible with attribution, but only when the application preserves dependable links. Session pooling and asynchronous jobs make those links particularly important.

## Example: distinguishing a queried view from underlying columns

An analyst queries a view that returns customer references and purchase totals. The view filters out restricted accounts using a status column that does not appear in the result.

An investigation asks whether the analyst accessed the status data.

The answer depends on what “accessed” means. The database used the column to determine the result, but the view did not project its values.

Snowflake Access History provides a concrete implementation of this distinction. It records directly accessed objects and underlying base objects, including columns used to determine results. Its documentation explains how projected view columns and underlying filtering columns appear in different parts of the record. Access History requires Enterprise Edition or higher. [Snowflake Access History](https://docs.snowflake.com/en/user-guide/access-history)

This supports object and column investigation, but should not be stretched into proof that a particular person saw every underlying value.

Coverage also varies by operation. Snowflake documents that failed queries appear in Query History rather than Access History. The Account Usage Access History view can have latency of up to three hours. [Snowflake Access History usage notes](https://docs.snowflake.com/en/sql-reference/account-usage/access_history)

A recent absence from that view is therefore not conclusive evidence that no attempt occurred.

## Example: following a report into object storage

A reporting job exports a sensitive dataset to object storage. The warehouse records the export, but a later download occurs through the storage service.

Warehouse query history cannot establish who subsequently retrieved the file. The investigation needs the export destination, job reference, and storage access records.

For Amazon S3, CloudTrail data events cover object operations such as `GetObject`. These data events are not logged by default, do not appear in CloudTrail Event history, and incur additional charges when enabled. [S3 CloudTrail events](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html)

Enabling management-event logging alone does not create a complete object-read trail.

If a download uses a shared role, delegated credentials, or an application-mediated link, investigators must interpret the recorded principal accordingly. The application may need additional evidence connecting issuance or use of that access path to an authenticated requester.

The trail still cannot observe every later action. Someone may open a downloaded file offline or photograph a screen. Audit scope ends where reliable observation ends.

## Protect the evidence without copying the data

Access logs can reveal sensitive facts themselves: which customer was investigated, which employee accessed a medical dataset, or which internal project exists.

Keep the evidence required for accountability, while avoiding routine copies of results, passwords, access tokens, and full request bodies. SQL text and resource names also deserve scrutiny. BigQuery explicitly warns that its audit logs can contain sensitive SQL, schema definitions, and resource identifiers. [BigQuery audit-log visibility](https://docs.cloud.google.com/bigquery/docs/reference/auditlogs)

Restrict audit readers and administrators, record access to the audit system, and separate ordinary application permissions from the ability to alter retained evidence. OWASP recommends protecting logs against unauthorized access and modification, monitoring logging failures, and avoiding direct logging of sensitive values. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

Tamper evidence strengthens investigation. CloudTrail log-file integrity validation uses hashes and signed digest files to detect changes to delivered logs. Enabling digest delivery does not itself perform validation; validation must actually run. [CloudTrail integrity validation](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html)

A valid signature supports the integrity of delivered evidence. It does not prove that every relevant access path was configured to emit evidence.

## Treat coverage as an operating responsibility

Maintain an explicit account of covered applications, interfaces, resources, event types, and exclusions. Include successful reads, denials, exports, privileged access, and changes to logging or permissions where relevant.

Cached results need particular attention. BigQuery does not emit `TableDataRead` events when a query uses cached results because the referenced tables are not read. Other evidence is needed to investigate that interaction. [BigQuery audit-event limitations](https://docs.cloud.google.com/bigquery/docs/reference/auditlogs#data_access_data_access)

Monitor delivery delay, dropped events, collection failures, and unexpected silence. Use controlled accesses to synthetic resources to verify that expected evidence arrives and remains searchable. Test denial paths as well as successful ones.

Sampling may suit performance telemetry, but it weakens claims about individual access. Any sampled audit coverage needs an explicit limitation.

Retention should match investigation needs and applicable requirements. Access trails are not a reason to preserve identifying evidence indefinitely.

## Costs, limitations, and related patterns

Audit trails add event volume, storage, indexing, collection infrastructure, and investigation work. Capturing evidence synchronously can add latency; asynchronous delivery introduces delay and loss risks. Logging failures need a deliberate response appropriate to the operation’s importance.

The pattern is especially useful for sensitive data, shared service identities, privileged workflows, and systems with several access interfaces. Its value depends on usable correlation and active review, not merely accumulating records.

Audit trails support investigation after access. They do not replace authorization, establish a person’s motive, or guarantee that credentials were used by their rightful holder.

[[data-row-and-column-level-access|Row- and Column-Level Access]] controls permitted use; audit trails preserve evidence of decisions and observed operations.

[[data-policy-as-code|Policy as Code]] can provide versioned authorization context that helps explain historical decisions.

[[data-data-minimization|Data Minimization]] limits what the trail captures without removing essential accountability.

[[data-classification-based-retention|Classification-Based Retention]] gives audit evidence a justified lifecycle, including preservation exceptions and eventual disposal.
