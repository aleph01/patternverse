---
id: agentic-review-intent-and-risk
type: pattern
title: 'Review Intent and Risk'
summary: 'Review changes against intended behavior and concentrate reasoning on consequential assumptions, validating findings before acceptance.'
status: published
tags:
  - agentic-coding
  - code-review
  - risk
  - authorization
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of engineering review guidance, authorization guidance, and JavaScript execution semantics. Cases, diffs, and reviewer allegations are fictional; bounded reference experiments are identified separately.'
---

## Purpose and problem

An agent returns a polished import screen, passing checks, and a large patch. Review comments accumulate on naming and spacing. A short write loop quietly changes existing-stock rejection into replacement and removes the all-or-nothing boundary.

Review Intent and Risk starts with the purpose of the change and follows the paths whose mistakes would matter. It allocates deeper reasoning to consequential, uncertain behavior while keeping the whole change accounted for. It does not turn a quick sample of interesting lines into approval of an unreadable patch.

## Core idea

Ask what the change is supposed to do, what must remain true, and where its implementation could violate those obligations. Then trace important inputs through authority checks, decisions, state changes, and outputs.

Automation can check formatting, execute cases, or propose defects. Acceptance still requires relating that evidence to the intended behavior. [Google’s review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html) begins with design and functionality and asks reviewers to consider tests, complexity, and consequential concurrency behavior. Local neatness is one part of that assessment.

## How it works

### Establish intent and account for the patch

Read the requirements, constraints, non-goals, and relevant architecture before treating the diff as its own explanation. Compare the proposal with existing behavior: has a create-only route become an update route, has a shared authorization helper been bypassed, or has a transaction become several independent writes?

Map changed areas to their purposes and evidence. Include generated files, configuration, dependency changes, and changed tests when present. Use automation for mechanical consistency, but inspect what the automated rule actually covers. If consequential behavior cannot be understood, request context, remove unrelated work, or split the review unit before accepting it.

Choose depth according to consequences and uncertainty. A permission condition, destructive write, irreversible effect, migration, or unclear failure boundary deserves close tracing even when it occupies few lines. Familiar formatting changes may need less reasoning once their mechanical scope is established. Review effort is not an arbitrary line-count threshold or a numerical risk score.

### Trace claims into evidence and dispositions

For each important path, inspect the initiating input, server-established identity, resource lookup, permission decision, mutation boundary, failure handling, and returned result. Compare denied operations with permitted ones. Inspect existing helpers and callers beyond the changed lines when their contracts determine correctness.

Give critique a specific defect-finding mandate. For this importer, a useful brief is: “Find paths that overwrite existing stock, write rejected rows, or leave a partial import. Identify the preconditions, code location, violated rule, and evidence; separate confirmed defects from assumptions.” A second model is not independent merely because it is different; it needs defensible criteria and relevant context.

GitHub’s [agent application card](https://docs.github.com/en/copilot/responsible-use/agents) documents missed issues and false-positive review comments and advises validating generated feedback. Treat a plausible allegation as a question to investigate. Record its mechanism, inspected evidence, any confirming or refuting check, and disposition: confirmed, refuted within stated assumptions, or unresolved. A suggested fix needs review too.

Tie findings, check results, and acceptance to the actual revision and integration base. Reassess affected reasoning after changes, especially altered permissions, contracts, or persistence boundaries. Keep a coherent correction and its meaningful checks reviewable together. Review acceptance, integration, product acceptance, the team’s Definition of Done, agent stopping, and release remain separate claims. Update existing review and backlog records rather than prescribing extra Agile ceremonies.

## Worked examples

These cases, diff excerpts, and reviewer claims are fictional. Disposable SQLite and JavaScript references verify the stated mechanisms; they are not a production code review, authorization audit, or recorded output from an automated reviewer.

### Inspect overwrite policy and the write boundary first

The CSV importer must reject existing SKUs, retain existing inventory, and apply valid new rows all or none. Updating stock is a non-goal. A fictional patch changes preview copy, helper names, validation, and persistence. Its consequential excerpt is schematic:

```diff
- validate(rows, currentInventory)
+ validate(rows)

- insertNewRowsAtomically(rows)
+ for (const row of rows) await upsertOne(row)
```

Before spending most attention on wording, the reviewer follows what reaches the writer. With initial `P100: 4`, input `P100,99` followed by `P201,3` must be rejected without writes. The proposed upsert path instead produces `P100: 99, P201: 3` in a SQLite reference. Successful execution has implemented an unauthorized product-policy change.

A second case uses valid new rows P201: 3 and P202: 2, with an injected exception before the second write. A per-row committed reference retains P201: 3 after failure. A single-transaction reference retains only the baseline `P100: 4`. The failure exposes the write boundary independently of the overwrite rule; changing upsert to insert alone would not repair it.

The review disposition is to request changes: preserve existing-SKU rejection and the all-or-nothing path, with checks for both obligations. Preview copy and naming still need coverage, but cannot compensate for those defects. The SQLite results verify these reference scenarios, not the real importer’s transactions, concurrent writes, or every failure point.

![A fictional diff inventory separates preview copy and helper names from removed existing-stock validation and a per-row upsert loop. Direct labels trace existing-SKU overwrite and partial persistence to their violated requirements, without assigning a numerical risk score.](../assets/agentic-coding/review-import.svg 'Fictional diff and executed SQLite references. Initial P100:4 and the selected create-only, all-or-nothing contract determine the review. Existing-stock overwrite and per-row commit are separate defects; mechanical cleanup still needs coverage, and no production importer was executed.')

### A small permission condition changes the allowed writer

Project **P7** has owner U1. Its policy permits the owner or a current editor of P7 to rename it. Being authenticated or editing another project is insufficient. The patch replaces a resource-specific guard:

```diff
- if (!canEdit(actor, project)) return forbidden()
+ if (!actor) return forbidden()
```

Trace the authenticated request `U2 → rename P7 to "Revised"` through trusted membership data and the write. Hold P7’s initial title `Plan` and the requested action constant while varying only U2’s relationship:

| Server-established relationship | Required path                     | Authentication-only guard |
| ------------------------------- | --------------------------------- | ------------------------- |
| Editor of P7                    | Permit; write once; title Revised | Permits                   |
| Viewer of P7                    | Deny; zero writes; title Plan     | Incorrectly permits       |
| Editor of P8 only               | Deny; zero writes; title Plan     | Incorrectly permits       |

The reference truth table also permits P7’s owner and denies a missing actor. Restoring the resource-permission decision rejects the viewer and cross-project cases while retaining the allowed paths. Check the unchanged state and write count as well as the response; hiding the rename control is not a server permission check.

[OWASP’s authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) calls for permission checks on every request and the specific object or action. The review requests restoration of that boundary and relevant allowed/denied checks. It still needs evidence from the actual session, membership lookup, route, and storage path; this truth table is not a complete authorization assessment.

![The same U2 rename request targets P7 from the same title Plan. An editor-of-P7 path reaches one write; viewer-of-P7 and editor-of-P8 paths stop before writing. A separate callout shows how the proposed authentication-only guard wrongly joins those denied paths to the writer.](../assets/agentic-coding/review-permission.svg 'Executed policy reference with controlled relationship fixtures. Server-established membership, not a request-supplied role, determines the required decision. Permitted and denied paths share the same vocabulary; the small guard change is consequential despite its size. Production authorization remains untested.')

### Validate a plausible race allegation against execution semantics

A fictional automated reviewer alleges: “Two confirmations can both read PV7 before either deletes it.” The supplied implementation uses a private built-in `Map` in one JavaScript agent. Every consumer uses this synchronous helper with primitive string keys; there are no callbacks, reentrant calls, or suspension points inside it:

```js
function take(id) {
  const value = pending.get(id);
  if (value === undefined) return null;
  pending.delete(id);
  return value;
}
```

The confirmation path calls `take` before its first `await` for persistence. The reviewer inspects that ordering and the deployment assumption rather than adding a lock immediately. ECMAScript’s [job execution rules](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-jobs) permit only one evaluating job per language agent and require a job to finish before another starts. Here “agent” names a JavaScript execution unit, distinct from a coding assistant.

A two-call JavaScript reference returns `saved` and `missing`, with one persistence call. As a contrasting check, deliberately inserting an `await` between lookup and deletion allows both calls to retain the value, producing two persistence calls. That change is a separate counterexample, not evidence that the original helper yields.

The disposition is **refuted for the supplied read/delete mechanism under the inspected single-agent assumptions**. The code structure and execution model supply the argument; one successful run alone would not prove absence of races. Record the assumptions so a later asynchronous helper, shared store, or multi-process deployment triggers reassessment. This conclusion does not establish durable one-time consumption, retry correctness, or transaction safety after persistence fails.

![A fictional race allegation is tested against a synchronous private-Map helper and single-agent job ordering. The reference yields one saved and one missing result; a separately changed helper with an await between read and delete yields two saves. The disposition is scoped refutation, not approval of all concurrency behavior.](../assets/agentic-coding/review-claim.svg 'Reviewer claim is invented; JavaScript reference checks were executed. The decisive evidence is the original helper’s lack of a suspension or reentry point under the stated execution model. The await counterexample changes that assumption. Distributed, durable, and failure-recovery guarantees remain outside the check.')

## Assumptions for correctness

Intent and permission rules must have an authoritative basis. The reviewed code, runtime, and deployment model must match the evidence. Findings need enough context to distinguish actual defects from misunderstood helpers or unreachable paths. Missing context leaves a finding unresolved; confidence or automation volume cannot fill that gap.

## When to use it

Use this pattern when generated changes exceed comfortable equal-depth inspection, when a small patch changes authority or persistent effects, or when automated critique produces plausible claims. If the review unit remains too broad to account for, reduce it instead of accepting a sample.

## Tradeoffs and operating costs

Tracing consequential paths and validating findings takes time and domain knowledge. Specialist review can be necessary for unfamiliar boundaries. Mechanical checks save attention only within their scope; an elaborate reviewer pipeline can also create work by generating low-quality allegations. Keep mandates and evidence focused.

## Common mistakes and limitations

Risk-based attention is not permission to ignore the rest of a change. Test counts and automated approval do not establish alignment with requirements. A dismissed false positive does not validate the whole patch, and a confirmed defect does not make every proposed remedy correct. Retain unresolved findings, narrow conclusions, and reassessment triggers rather than rubber-stamping the latest green revision.

## Related patterns

[[agentic-make-boundaries-and-decisions-explicit|Make Boundaries and Decisions Explicit]] is a local draft establishing scope and authority; review checks whether the change respects them.

[[agentic-deliver-small-reviewable-changes|Deliver Small, Reviewable Changes]] is a local draft organizing coherent review units; this article allocates reasoning within those units.

[[agentic-establish-independent-checks|Establish Independent Checks]] is a local draft grounding expected results; review validates the criteria and their implications.

[[agentic-verify-the-complete-behavior|Verify the Complete Behavior]] is a local draft exercising assembled paths; review decides which paths and assumptions deserve scrutiny and how far their evidence reaches.

## Sources and further reading

- [Google Engineering Practices: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) — design, functionality, tests, and careful concurrency reasoning.
- [GitHub: Application card for Copilot Agents](https://docs.github.com/en/copilot/responsible-use/agents) — missed findings, false positives, and validating generated review feedback.
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — request- and resource-specific permission decisions.
- [ECMAScript: Jobs](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-jobs) — single-agent job evaluation and run-to-completion semantics.
