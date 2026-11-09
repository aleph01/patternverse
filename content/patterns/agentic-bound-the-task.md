---
id: agentic-bound-the-task
type: pattern
title: 'Bound the Task'
summary: 'Delegate an outcome with explicit authority, resources, decision triggers, and a verifiable handoff, supported by appropriate environment permissions.'
status: published
tags:
  - agentic-coding
  - delegation
  - authority
  - permissions
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on least privilege, agent authorization guidance, focused change review, and Agile scope adaptation. All tasks, services, permissions, and results in the examples are fictional.'
---

## Purpose and problem

“Implement import preview” sounds bounded. The agent can edit the preview, but its tools also expose a database console and deployment credentials. When it encounters an inconvenient schema, it treats changing the schema as another implementation step. The request named an outcome without establishing the authority to pursue it.

Bound the Task combines the intended result with an operating agreement: permitted changes, available resources, decisions the agent may make, conditions that require returning, and evidence for the handoff. The task should give useful discretion within a clear boundary.

## Core idea

An agent needs answers to five connected questions:

| Part              | Question                                | CSV-preview example                                                     |
| ----------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Deliverable       | What result should be inspectable?      | A read-only preview with row errors.                                    |
| Authority         | What changes and effects are permitted? | Preview code and relevant checks; no schema or production changes.      |
| Resources         | What may it use?                        | Existing validator, synthetic fixtures, local renderer and test runner. |
| Decision triggers | What changes the agreement?             | A required schema change or unresolved product rule.                    |
| Handoff           | What supports the completion claim?     | Scoped diff, rendered preview, check results, and remaining gaps.       |

Task authority is an agreement. Tool permissions are technical capabilities. An operation can be reachable yet unauthorized, or permitted in principle but unavailable in the current environment. The agent must respect both limits.

NIST defines least privilege in terms of the minimum authorizations and resources needed for a function. Applying it here means matching access to the delegated outcome, rather than giving every session the same capabilities. [Least privilege](https://csrc.nist.gov/glossary/term/least_privilege)

## How it works

Choose a coherent result that can be reviewed. Describe the relevant code areas and effects without prescribing every helper or edit. Include ordinary supporting work: tests, necessary dependency records, and documentation may belong with the change even when they live outside the main folder. Google's change-review guidance favors self-contained changes with related tests and enough context to understand their implications. [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)

Separate routine uncertainty from consequential uncertainty. The agent can choose names, organize local code, investigate a failing check, and correct its own implementation within scope. It should return when progress requires a new product rule, broader interface change, additional authority, or an effect outside the agreement. Include the evidence, affected boundary, alternatives, and work that can still proceed independently.

Support written limits with controls where consequences warrant them. Scope accessible tools, credentials, files, and service operations. Enforce authorization in the execution layer outside the model's context; a sentence in a prompt is not an access-control mechanism. OWASP's agent-security guidance explicitly separates scoped tools and execution authorization from model instructions. [AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)

Record the starting revision, relevant working changes, and the stopping condition. Return a reviewable artifact with evidence tied to that state, or a precise blocked handoff. A permission denial is a boundary to report, not an invitation to find another route to the prohibited effect.

## Worked examples

### Preview work has no production-write authority

In this fictional inventory task, the agent must implement preview for `sku,quantity` rows. The fixture contains `P201,3` followed by `P202,-1`; inventory begins with `P100: 4`. The required preview shows the second data row's negative-quantity error and leaves inventory unchanged.

The agreement allows edits to preview code and relevant checks, reuse of `validateProduct`, and local rendering against synthetic data. It excludes inventory-schema changes, production migration, and release. Choosing the layout or a local error-mapping helper needs no additional decision.

The illustrated execution environment permits writes to the task workspace and scratch outputs. Schema files are read-only, and its execution broker denies production-service and deployment operations independently of the model. Production credentials are not supplied. These are assumed controls in the teaching case, not a configuration tested by this article; actual environments require their own verification with safe test resources.

![A fictional task envelope contains CSV preview code, the existing validator, synthetic fixtures, and local checks. A separate execution boundary denies schema writes, production-service operations, and deployment. The preview shows the negative row error without writing inventory.](../assets/agentic-coding/task-preview.svg 'Written scope and modeled technical controls are separate. The diagram specifies an intended permission design, not proof of sandbox isolation or a production denial test. P100:4 is the required unchanged fixture state.')

If implementation appears to require a new quantity type, the agent returns that finding and continues independent preview work. It does not migrate data to make the local task easier. The handoff includes the diff, row-error evidence, a rendered preview, and anything unverified. Preview acceptance does not establish import confirmation, persistence, or production readiness.

### A package update discovers a service boundary

A fictional task permits updating `stock-client` within `inventory-ui`, including necessary lockfile entries and package checks. It excludes changes to `inventory-api` and unrelated dependency upgrades. Reading the service contract is allowed; editing that service is not.

The current wire format sends `{quantity: 3}`. The proposed client version sends `{quantity: {value: 3, unit: "item"}}`, while the service still requires an integer. These invented contracts describe a compatibility break, not a real library release.

The agent records the differing payloads and the affected consumer, then asks whether a local compatibility adapter can preserve the existing wire contract. That is a bounded investigation within the package. It does not assume the adapter is supported or rewrite the service first.

![The permitted inventory-ui package update changes a fictional stock-client payload from integer quantity to a value-and-unit object. The inventory-api contract remains outside edit authority. The decision fork distinguishes an in-package compatibility investigation from deferral or an explicitly coordinated scope change.](../assets/agentic-coding/task-contract.svg 'Arrows identify the wire dependency and conditional next steps. No compatibility result is asserted. Discovering the consumer does not extend authority to change it or deploy either service.')

If compatibility is supported and verified, continue within the agreement. Otherwise, return the choice to defer or arrange a coordinated change with explicit authority and evidence requirements. Do not hide the break with a permissive test. A package-scoped task can legitimately stop at a decision while retaining useful findings.

### Broad local editing freedom can have a narrow effect

A fictional documentation task corrects the accepted example `P202,-1` to `P202,0` under the established non-negative rule. The agent may reorganize explanatory text and fix links anywhere inside `docs/import-guide/`. Product policy, executable examples, and application behavior remain outside this task.

Within that folder, ordinary editorial choices are delegated. Evidence is proportionate: check the sample against the rule, inspect links and rendered views, and confirm the diff stays within the agreed content change. Application runtime tests do not establish whether this prose correction is accurate.

Compare the identical text edit in two environments. In a disposable local preview, the agent may save and render freely within its workspace. On a production-served page, saving could publish immediately. The same keystrokes therefore need different authority. This task provides a local draft; it does not grant live publishing rights.

![Matched before-and-after documentation edits replace P202,-1 with P202,0 in a disposable local draft and a production-served page. Local save and preview are delegated; live publishing is outside this task and unavailable to its tools.](../assets/agentic-coding/task-docs.svg 'The text and policy are held constant while the environment and resulting effect change. Local editing freedom does not imply production publishing authority. The comparison is fictional and has no numerical risk score.')

The result is a reviewable documentation change with accuracy, link, rendering, and scope evidence. If the task discovers that the documented policy itself is wrong, report that separate question. Neither a small diff nor prior success with documentation authorizes a product-policy change.

## Assumptions for correctness

The agreement must match available tools and the affected system. Controls must cover the execution paths that can create the relevant effects; withholding one credential alone does not establish isolation. Check the actual environment rather than relying on a label such as “local.”

The receiving person must be able to inspect the artifact and unresolved questions. State changes after the recorded checks can require renewed verification.

## When to use it

Use this pattern when delegating work with shared interfaces, persistent state, external services, or ambiguous authority. It also helps low-impact tasks by making clear which decisions can proceed without interruption.

## Tradeoffs and operating costs

Overly narrow bounds create unnecessary handoffs; overly broad authority makes consequences hard to contain. Adjust the agreement when evidence reveals necessary work, rather than accumulating a permanent approval rule for each edit.

Use existing Agile planning and review conversations. Scrum teams can renegotiate Sprint Backlog scope while preserving the Sprint Goal; other approaches can adapt through their normal workflow. A story can span several sessions, branches, and reviewable changes. [Scrum Guide](https://scrumguides.org/scrum-guide.html)

## Common mistakes and limitations

Do not confuse written prohibitions with enforced permissions, tool availability with authorization, or routine implementation choices with decisions requiring escalation. Autonomy demonstrated on a disposable task does not establish suitability for every environment.

Keep completion levels distinct. Product acceptance criteria describe behavior; the team's Definition of Done describes shared quality obligations; the agent's stopping condition closes this delegated task. A reviewable change still needs applicable review and integration, and release follows its own authorization.

## Related patterns

[[agentic-make-boundaries-and-decisions-explicit|Make Boundaries and Decisions Explicit]] separates permitted changes, invariants, and open choices; Bound the Task turns those into a delegated operating agreement with resources, authority, and return conditions. [[agentic-agree-on-done|Agree on Done]] determines which evidence closes each level of work. [[agentic-keep-context-durable-and-discoverable|Keep Context Durable and Discoverable]] preserves the handoff and its provenance. [[act-within-your-discretion|Act Within Your Discretion]] concerns action within existing human discretion; this article adds agent-tool permissions and engineering artifacts.

## Sources and further reading

- [NIST: Least privilege](https://csrc.nist.gov/glossary/term/least_privilege) — task-appropriate authorizations and resources.
- [OWASP: AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — scoped tools and execution-layer authorization.
- [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) — coherent changes and related checks.
- [The Scrum Guide](https://scrumguides.org/scrum-guide.html) — adapting work while preserving the Sprint Goal.

All cases and permission designs are original fictional illustrations. No sandbox, production access control, service upgrade, or agent workflow was implemented or evaluated for them.
