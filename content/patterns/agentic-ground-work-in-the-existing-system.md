---
id: agentic-ground-work-in-the-existing-system
type: pattern
title: 'Ground Work in the Existing System'
summary: 'Trace relevant behavior, dependencies, state, and checks before editing, using inspected evidence to replace plausible assumptions about the repository.'
status: published
tags:
  - agentic-coding
  - context
  - code-navigation
  - dependencies
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on documented engineering review, dependency installation, and testing practices. All application paths, dependency contracts, revisions, and diagnostic results in the examples are fictional.'
---

## Purpose and problem

An agent adds a CSV validator because none appears in the upload component. Elsewhere, the application already has the validation service used by manual entry. The new implementation accepts different quantities and saves through a lower-level storage call. The patch is locally plausible and inconsistent with the system around it.

Ground Work in the Existing System means establishing a targeted account of the behavior being changed before choosing an implementation. Find where requests enter, where decisions occur, where state changes, and what checks already exist. The useful result is enough verified context to guide this change, rather than a description of the whole repository.

## Core idea

Distinguish three things that often blur together:

| Kind of context             | What it establishes                   | Fictional import example                                             |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| Inspected source            | What the current code appears to do   | Manual entry calls `validateProduct`.                                |
| Reproduced behavior         | What happened under stated conditions | A negative quantity produces `quantity_nonnegative`.                 |
| Assumption or open question | What still needs evidence             | Can CSV errors preserve the current field codes and add row numbers? |

Source inspection explains a path; a controlled run checks a particular behavior along it. Neither makes every existing convention correct. Requirements still determine whether observed behavior should be retained or changed.

## How it works

Start from the requested outcome and follow the relevant entry point through callers, dependencies, validation, and writes. Search for both names and behavior: an identifier search finds direct callers, while an error code or user-visible message can reveal another route into the same rule. Inspect definitions and representative uses; a search hit alone does not establish the active path.

Read applicable repository instructions and identify the normal local setup, runtime, test commands, and fixture preparation. Establish the starting behavior with the smallest relevant check. In Python projects, even the import layout can determine whether tests exercise the checkout or an installed package; pytest's integration guidance explains that distinction. [Good Integration Practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html)

For dependencies, compare the declared range, lockfile resolution, and package actually loaded by the relevant workspace. Consult documentation or release notes for that version. npm documents lockfiles as records of the resolved tree, and `npm ci` as a clean installation that rejects manifest/lockfile disagreement. Use the repository's own package manager and setup procedure; a lockfile alone does not reproduce services, data, or operating-system behavior. [package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) · [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

Keep a short evidence map: relevant locations, observed behavior, commands and results, revision, and unresolved questions. Stop exploring when the planned edit, reuse points, and verification path are clear. Broaden the investigation when a dependency or contradiction makes that map unreliable.

## Worked examples

### Find the validation and write boundaries before adding import

This fictional case extends the inventory example in [[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]]. Inventory begins with `P100: 4`. Import must reject invalid files without changing inventory and preserve manual entry.

At fictional revision **BASE-E**, inspection finds `ProductForm` calling `validateProduct`, then `createProducts`. The validator returns field codes; `createProducts` enforces existing-SKU rejection and an all-or-none transaction. Manual entry supplies a single-product list to that same write boundary. Direct storage access would bypass those obligations.

The teaching investigation reproduces a manual-entry negative quantity and gets `{field: "quantity", code: "quantity_nonnegative"}`. It also finds a test for rollback when a batch contains an existing SKU. That test is useful evidence about its fixture, not proof of every concurrent-write case.

The reuse decision is now specific: decode CSV rows, convert quantity text using the agreed rules, call the existing validator, and attach CSV row numbers in an import adapter. A file containing `P201,3` and `P202,-1` should show a row-2 quantity error, excluding the header. Preview must remain read-only. Confirmation should use `createProducts`, retaining its transactional checks.

![A proposed CSV path joins the inspected validateProduct service already used by ProductForm. Preview has no write connection; only confirmation reaches createProducts and its transaction before inventory. A negative row prevents confirmation and preserves P100:4.](../assets/agentic-coding/ground-import.svg 'Fictional system map. Solid paths identify inspected existing relationships; dashed paths identify proposed import wiring. Reuse preserves a known boundary, but the new adapter and complete confirmation behavior still require verification.')

The map changes the implementation plan before edits begin. The adapter's row numbering, complete error display, confirmation revalidation, and manual-entry regression checks remain work to verify. Discovering a reusable service does not establish that the feature is complete.

### Inspect the version contract instead of remembering a signature

Suppose an upgrade moves the invented **RowReader** library from **1.8.0** to **2.1.0**. These versions and APIs are fictional. The intended operation is unchanged: read `sku,quantity` headers and the row `P201,3`.

The agent remembers `reader.parse(text)` returning a list. Before changing callers, inspect the old usage, target-version migration notes, and the actual resolved module after the controlled upgrade. In this example, the lockfile and loaded module both identify 2.1.0, whose contract is:

```js
const { rows, issues } = reader.read(text, { header: true });
```

The declared result for this fixture is `rows: [{sku: "P201", quantity: "3"}]` and `issues: []`. Quantity is still text; parsing the table does not enforce inventory rules. An adapter must handle the result envelope and issues before product validation.

![The same CSV input is compared against a remembered parse(text) call and the fictional RowReader 2.1.0 read(text, header:true) contract. Lockfile and loaded module agree on 2.1.0; the inspected result has separate rows and issues, with quantity still text.](../assets/agentic-coding/ground-interface.svg 'A constructed interface comparison, not documentation for a real package. Version inspection changes the call and result handling; it does not establish compatibility for malformed files, streaming, or the full application.')

Keep the intentional dependency and adapter changes reviewable together. Missing-header and malformed-input checks still need to establish the required behavior. A passing ordinary example cannot justify copying the adapter into every caller without examining its assumptions.

### Locate a missing fixture before repairing application code

A fictional local import check stops with `ENOENT` while loading `fixtures/inventory.csv`. The agent proposes returning an empty inventory when loading fails. That would conceal the setup problem and change error behavior.

Inspect the failing operation, resolved path, working directory, and setup instructions. In this teaching case the path is correct, but a documented fixture-generation step has not run. The application import function has not been reached. Node documents `ENOENT` as a missing file or path component; the code alone does not explain why it is missing. [Common system errors](https://nodejs.org/api/errors.html#common-system-errors)

Restore the expected synthetic fixture containing `P100,4`, keep application code and runtime unchanged, and rerun the same check. The constructed result now reaches the import assertion: `P100,8` is rejected and inventory remains `P100: 4`.

![Environment, fixture setup, and application assertion are shown as separate layers. A missing fixtures/inventory.csv stops the initial run before application code. Restoring the synthetic P100,4 fixture lets the same check reach the existing-SKU assertion without changing the application.](../assets/agentic-coding/ground-fixture.svg 'Controlled fictional diagnosis: only fixture availability changes between runs. Reaching and passing this assertion does not establish the health of the entire environment or prove that missing production data should be ignored.')

pytest likewise distinguishes a setup error from a test assertion failure: when a required fixture fails, the dependent test may not be attempted. The same diagnostic distinction applies even when another runner is used. [About fixtures](https://docs.pytest.org/en/stable/explanation/fixtures.html)

## Assumptions for correctness

The inspected code must correspond to the running revision and configuration. Confirm active routes, feature flags, generated code, and workspace resolution where they affect the change. Use synthetic data and a suitable environment for reproductions with side effects.

Treat canonical examples as candidates for reuse. Check their current callers and expectations; an abandoned example can preserve an obsolete interface or a defect.

## When to use it

Use this pattern for unfamiliar repositories, cross-cutting behavior, dependency upgrades, and unexpected local failures. For a copy correction, the relevant route and rendering convention may be enough; tracing storage would add no useful context.

## Tradeoffs and operating costs

Exploration consumes time and context, and maps become stale. Record the revision and preserve useful findings near the existing work item. After integration changes the surrounding code, revisit affected assumptions rather than redoing every investigation.

In team and Agile work, discovered dependencies can refine the implementation plan through existing conversations. A story need not map to one session or branch. Broad repository cleanup should remain a separate decision.

## Common mistakes and limitations

Do not turn every discovered failure into an application patch, or treat a successful baseline as agreement with current product behavior. Google's review guidance emphasizes system context and meaningful checks; the targeted pre-edit map here is an editorial application of that discipline. [What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)

Grounding prepares implementation. It does not satisfy acceptance criteria, the team's Definition of Done, integration requirements, or release authorization by itself.

## Related patterns

[[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]] defines intended behavior; grounding discovers the actual starting system. [[agentic-make-boundaries-and-decisions-explicit|Make Boundaries and Decisions Explicit]] uses discoveries to distinguish permitted work from unresolved choices. [[agentic-agree-on-done|Agree on Done]] connects completion to evidence at the right level. [[map-before-you-learn|Map Before You Learn]] provides broad learning orientation; this pattern traces a particular software behavior and its operating context.

## Sources and further reading

- [Google Engineering Practices: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) — functionality, context, and meaningful tests.
- [npm: package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) and [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) — resolved dependencies and installation consistency.
- [pytest: Good Integration Practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html) — test layout and which code is imported.
- [pytest: About fixtures](https://docs.pytest.org/en/stable/explanation/fixtures.html) — setup context and fixture errors.
- [Node.js: Common system errors](https://nodejs.org/api/errors.html#common-system-errors) — meaning of `ENOENT`.

The application traces, RowReader contract, and before/after results are invented teaching material, not repository findings or an evaluated coding-agent workflow.
