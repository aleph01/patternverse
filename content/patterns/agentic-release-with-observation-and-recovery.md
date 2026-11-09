---
id: agentic-release-with-observation-and-recovery
type: pattern
title: 'Release with Observation and Recovery'
summary: 'Connect controlled user exposure to meaningful observations and recovery that accounts for application compatibility and persistent effects.'
status: published
tags:
  - agentic-coding
  - release
  - observability
  - recovery
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of release engineering, feature control, compatible migration, and compensation guidance. Release identities, cohorts, incidents, and observations are fictional; bounded reference checks are identified separately.'
---

## Purpose and problem

The importer is deployed, its jobs report completion, and the release looks healthy. Then someone notices that existing stock changed despite a create-only requirement. Disabling the button can prevent another click; it cannot restore yesterday’s quantities or recall a notification.

Release with Observation and Recovery connects exposing a change to evidence and a practical response. Decide what can expand, what must pause, and how to contain and repair harm before live use creates those decisions under pressure.

## Core idea

Treat release as **controlled exposure with conditional continuation**. Implementation creates the change; integration combines it with shared code; deployment installs an identifiable artifact; exposure gives users or jobs access to its behavior. These can occur at different times.

Observe outcomes that could disprove readiness, and prepare recovery for the state the change can create. A feature switch changes admission, a rollback changes running code, data repair changes persistent records, and fix-forward deploys a correction. None automatically performs the others.

## How it works

### Define exposure and evidence together

Record source revision, artifact digest, configuration, schema state, eligible population, responsible operator, and recovery prerequisites. Choose a proportionate first group and workload, then define the conditions for expansion, holding, or recovery. Google’s [canarying guidance](https://sre.google/workbook/canarying-releases/) relates useful evaluation to population, duration, workload, and signals; a short quiet period is not proof of safety.

Pair operational signals—errors, latency, backlog, and resource use—with domain correctness. For an importer, distinguish admission, accepted jobs, completion after durable commit, rejected input, missing or overdue jobs, and reconciled inventory. Attribute observations to the exposed version and cohort. A successful request or completion label alone can conceal bad writes. Missing telemetry or immature outcomes should hold expansion, while a confirmed integrity violation can justify stopping immediately.

A stable project allowlist may be clearer than a random request percentage for a stateful workflow. [Unleash’s activation documentation](https://docs.getunleash.io/concepts/activation-strategies) illustrates separating deployment from targeted activation. Evaluate the control on the server and worker paths, alongside normal authorization. Verify configuration propagation and account for requests already admitted; hiding a button or changing a flag does not cancel executing work.

### Keep forward and backward transitions compatible

During rolling deployment, old and new code may share data and messages. Test both reading and writing against the intermediate schema, including background workers and rollback candidates. AWS’s [rollback-safety account](https://builder.aws.com/content/3F04j2yRAAMBuPSPs50xwXZqg01/ensuring-rollback-safety-during-deployments) explains why individually working versions can still fail during an upgrade or downgrade.

Add compatible structure before depending on it, backfill under a defined meaning, and tighten or remove old structure only when remaining consumers permit it. Prisma’s [expand-and-contract guide](https://www.prisma.io/docs/guides/database/data-migration) demonstrates staged schema and application changes. A destructive cleanup or newly written representation can close a rollback path; document that boundary before crossing it. A migration reporting success is not evidence that old clients still work.

### Prepare separate recovery actions

Choose the least disruptive action that contains the fault. Disabling may suffice for one feature; reverting an artifact requires a still-compatible predecessor; fix-forward may be necessary when returning to older code is unsafe. Stop admissions, inspect queued and in-flight work, and verify containment before declaring further writes stopped.

Preserve operation identities, affected records, before/after evidence, and external-effect status. Repair from current state while respecting legitimate later work. Microsoft’s [compensation guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) emphasizes domain-specific decisions, concurrent changes, and repeat-safe recovery. Keep repair progress and audit evidence; uncertain provenance needs investigation, not a guessed reset.

Use existing review, backlog, and operating records. Product acceptance criteria define intended behavior; the Definition of Done supplies shared completion obligations. An agent can stop with a reviewable implementation while integration, release authorization, observation, and recovery readiness remain open. Several tasks or pull requests may contribute to one release. These distinctions fit different Agile workflows without requiring another ceremony.

## Worked examples

All releases, cohorts, incidents, and observation records below are fictional. Pure decision functions and disposable SQLite experiments check the stated mechanisms; no live rollout, production telemetry, online migration, or production repair was performed.

### Pause the importer despite a completed job

Release **R7** identifies source **MAIN7**, artifact **A7**, schema **D1**, and flag configuration **F7**. These are teaching labels, not real commit IDs or artifact digests. Deploy A7 with import admission disabled. After the applicable checks, expose only explicitly authorized projects **P7** and **P8**; **P9** remains excluded. Authorization still applies within the group.

The selected create-only contract rejects files containing existing SKUs without writes. Constructed observation **I7**, from P7, reports `completed`, yet changes P100 from 4 to 99 and P900 from 8 to 70. That is an integrity violation regardless of the successful status. Pause expansion, disable new import admissions, and investigate affected operations. Already committed quantities remain changed.

Reference functions permit P7/P8 and deny P9 before the stop. After disabling, they deny P7/P8 and a queued P7 job **J8** when it rechecks admission before starting. The decision function returns “stop and recover” for I7; without that violation but with insufficient evidence, it returns “hold.” It does not calculate a success rate or certify the next group.

Actual SDK propagation, worker fencing, cancellation, observed job duration, and running requests remain untested. Review completion and inventory reconciliation across representative work before expansion; a small group can miss rare failures and can still affect shared infrastructure.

![Deployment keeps artifact A7 installed while a separate server admission control exposes only P7 and P8. Constructed I7 evidence shows a completed label alongside forbidden stock changes, triggering a stop; disabling denies new admissions and queued J8 without reversing committed quantities.](../assets/agentic-coding/release-exposure.svg 'Fictional release and observation record, not measured production results. Arrows name admission, evidence, and containment relationships. The reference checks scope and decision logic only; a real stop requires propagation and in-flight work to be verified separately.')

### Make quantity units explicit without breaking old writers

Existing quantities already mean whole items, or **each**. Old client **A0** names `sku, quantity` explicitly in reads and inserts. New client **A1** adds an explicit `unit`, accepts only `each`, and interprets a legacy NULL as that established meaning. This is metadata clarification, not permission to convert unknown units.

| Schema stage                                                  | A0 behavior                       | A1 behavior and transition condition          |
| ------------------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| D0: no unit column                                            | Reads and writes work             | Not compatible; column is absent              |
| D1: nullable unit added                                       | Inserts may leave NULL            | Tolerates legacy NULL; writes `each`          |
| D2: backfilled, NOT NULL, default `each`, check `unit='each'` | Omitted unit receives the default | Reads and writes `each`; other units rejected |

Expand to D1 before deploying A1. While both clients operate, retain legacy interpretation. For D2, install the default and backfill with the constraint change under a suitable migration strategy; an uncoordinated backfill alone can race with another A0 insert. Retain the default while A0 remains a supported writer or rollback target.

A SQLite reference runs both named-column clients at D1 and D2. Fresh reads after D2 show P100:4, P201:3, P202:2, P203:1, and P204:0, all with unit `each`. A separate counterexample makes unit mandatory **without a default**: A0’s insert fails. New-client reads fail at D0 as expected.

The tiny reference uses transactional table reconstruction. It does not demonstrate online DDL, production lock duration, large backfill behavior, or every ORM’s SQL. Positional inserts, `SELECT *` assumptions, additional unit values, or later column removal require a new compatibility assessment. Restoring A0 is viable only within the tested contract, not because rollback is universally safe.

![A compatibility matrix shows A0 supported on D0, D1, and D2, while A1 requires the expanded D1 schema. D2 retains default each so legacy inserts remain valid; an explicitly rejected no-default alternative breaks A0.](../assets/agentic-coding/release-schema.svg 'Stages preserve the established each-based meaning and named-column SQL. Matrix entries concern executed SQLite reference clients, not deployed applications or online-migration guarantees. Stage arrows indicate planned schema order; the counterexample changes the default while keeping the required unit field.')

### Contain I7, then repair from current state

After I7’s overwrite, a legitimate sale **S9** removes two from P100: current quantities are P100:97 and P900:70. The audit trail identifies I7’s before/after values and the later sale. Disabling import, restoring compatible code **A6**, or deploying corrected **A8** leaves those records untouched. Delivered notification **N7** remains a separate obligation.

In this simplified additive-stock model, a domain-approved plan **C7** removes only I7’s erroneous increases: P100’s `99 − 4 = 95` and P900’s `70 − 8 = 62`.

| Record | Verified current state | C7 adjustment | Target preserving S9 |
| ------ | ---------------------- | ------------: | -------------------: |
| P100   | Quantity 97, version 2 |           −95 |                    2 |
| P900   | Quantity 70, version 1 |           −62 |                    8 |

Resetting P100 to its old quantity 4 would erase S9’s legitimate effect. These adjustments are conditional on complete provenance and the stated stock model; reservations, fulfillment, or dependent actions can require a different reconciliation.

The SQLite repair compares expected quantities and versions, records C7 and its ledger entries in the same transaction as both updates, and uses C7 as a stable retry identity. A controlled exception after the first update rolls the whole repair back. A successful retry produces P100:2 and P900:8 through a fresh connection; repeating C7 returns “already applied” without changing stock again. A separate intervening sale changes P900’s version, causing the stale plan to reject and roll back all its updates for reassessment.

Those checks verify this reference plan, not a production incident’s completeness or general compensation safety. Verify the corrected importer separately, resolve N7 through the appropriate delivery record, and gather new evidence before re-enabling admission. Neither a repaired table nor a fixed artifact alone closes recovery.

![Three recovery paths separate disabling admissions, changing application artifact, and repairing persistent records. Current P100:97 and P900:70 remain after code or flag changes; conditional repair C7 reaches P100:2 and P900:8 while preserving S9 and retaining a separate N7 notification obligation.](../assets/agentic-coding/release-repair.svg 'The stock, version, exception, retry, and stale-plan observations come from disposable SQLite checks. Arrows identify the effect each control changes. C7 assumes verified I7 provenance and the additive model; no real notification, production code rollback, or production repair was executed.')

## Assumptions for correctness

Signals must identify the relevant version, population, and mature outcome. Recovery requires authority, retained compatible artifacts, usable evidence, and tested operational access. Shared state, services, and dependencies can extend harm beyond the exposed cohort. Confirm the recovery path still exists after every material schema or configuration transition.

## When to use it

Use this pattern when agent-produced changes reach live workflows, persistent data, background jobs, or mixed-version deployments. Scale controls to consequences; a static copy correction and a destructive import do not need identical rollout machinery.

## Tradeoffs and operating costs

Cohorts, switches, compatibility paths, reconciliation, and retained rollback capacity require maintenance. Too many noisy signals obstruct decisions; too few miss important harm. Assign removal conditions to temporary flags and transitional schema behavior without deleting the only viable recovery path prematurely.

## Common mistakes and limitations

Do not treat successful HTTP responses as correct outcomes, missing telemetry as permission to expand, or disabling as cancellation and repair. A small sample cannot establish rare-event safety. Replaying an import is not a generic data-repair strategy, and restoring an old database snapshot can erase unrelated work. Live observation complements pre-release verification rather than replacing it.

## Related patterns

[[agentic-agree-on-done|Agree on Done]] separates completion claims; this draft supplies the exposure, observation, and recovery decisions beyond an implementation handoff.

[[agentic-keep-work-recoverable|Keep Work Recoverable]] retains restorable work and learning; this draft addresses live admission, compatible deployment, and persistent release effects.

[[agentic-verify-the-complete-behavior|Verify the Complete Behavior]] checks assembled paths before acceptance; this draft continues evidence gathering under controlled real exposure.

[[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] is a published model-serving neighbor. This draft broadens the engineering scope to application admission, schema compatibility, and data repair. Shadow testing keeps candidate outputs off the serving path; it cannot validate live side effects safely merely by copying requests.

## Sources and further reading

- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) — meaningful populations, durations, signals, and rollout decisions.
- [Unleash: Activation strategies](https://docs.getunleash.io/concepts/activation-strategies) — targeted activation distinct from deployment; no Unleash configuration was executed here.
- [AWS: Ensuring rollback safety](https://builder.aws.com/content/3F04j2yRAAMBuPSPs50xwXZqg01/ensuring-rollback-safety-during-deployments) — compatibility during forward and backward transitions.
- [Prisma: Expand-and-contract migrations](https://www.prisma.io/docs/guides/database/data-migration) and [SQLite: ALTER TABLE](https://www.sqlite.org/lang_altertable.html) — staged schema changes and reference-engine limitations; no Prisma migration was run.
- [Microsoft: Compensating Transaction](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) — concurrent work, domain-specific compensation, and repeat-safe repair.
