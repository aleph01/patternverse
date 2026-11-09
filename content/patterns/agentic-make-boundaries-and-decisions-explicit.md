---
id: agentic-make-boundaries-and-decisions-explicit
type: pattern
title: 'Make Boundaries and Decisions Explicit'
summary: 'Separate permitted changes, retained properties, assumptions, and unresolved choices so an agent can make progress without silently expanding the task.'
status: published
tags:
  - agentic-coding
  - specifications
  - scope
  - decision-records
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on architecture decision records, focused change review, and evolutionary design. All inventory, client-upgrade, and prototype cases are fictional teaching examples.'
---

## Purpose and problem

An agent is asked to add CSV import. While connecting the parser, it extracts a new validation layer, changes the manual-entry form, and decides that repeated product identifiers should update existing stock. The patch looks coherent. It also contains three decisions that the request never settled.

Make Boundaries and Decisions Explicit distinguishes the work being requested from nearby possibilities. It identifies what may change, what must remain true, and which choices require more evidence or agreement. The result is a clearer space for implementation and a visible place to return when discoveries change the task.

## Core idea

A boundary and a decision answer different questions. A boundary constrains the current task. A decision resolves a choice within or beyond it. An assumption is a belief that may be wrong; it should not acquire the authority of either simply because it appears in a confident plan.

Use these distinctions where they matter, without turning every task into a large form:

| Kind          | What it establishes         | Fictional import example                                       |
| ------------- | --------------------------- | -------------------------------------------------------------- |
| Scope         | Work permitted now          | Add preview and confirmation using existing validation.        |
| Non-goal      | Adjacent work excluded      | Do not add bulk editing or redesign the manual-entry form.     |
| Invariant     | Property that must survive  | Manual entry retains its current validation and save behavior. |
| Assumption    | Belief needing verification | Existing validation can be called independently of the form.   |
| Open decision | Choice not yet settled      | Should an existing identifier be rejected or replaced?         |

Reusing a validator is an intentional implementation constraint. Preserving manual-entry behavior is an observable requirement. Both can be justified, but they should not be confused.

## How it works

Inspect the existing system before treating assumptions as facts. Then identify the choices whose consequences exceed routine implementation: changed data meaning, public interfaces, dependencies, or externally visible effects. Consider what reversal would actually require. Restoring code may be easy while reconstructing overwritten data is difficult.

For a significant choice, retain its context, status, selected approach, and consequences. Michael Nygard’s architecture decision record format makes these elements explicit and preserves superseded decisions. This article applies that practice to agent work; it does not require an architecture record for every local edit. [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

Give unresolved decisions a useful next action: gather evidence, consult the appropriate decision-maker, or continue only the independent work. “Not decided” does not mean “the agent may choose a default.” Equally, a discovery outside scope should be reported rather than hidden or automatically implemented.

## Worked examples

### Decide whether import may overwrite stock

This fictional planning case precedes the no-overwrite rule in [[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]]. Inventory contains `P100: 4`. A file proposes `P100,8`. Rejecting that identifier preserves quantity `4`; replacing it stores `8`. Neither outcome follows from “add CSV import.”

The initial boundary permits import preview and confirmation, requires existing validation, and preserves manual entry. The agent first needs to inspect whether validation depends on interactive form state. If reuse requires a substantial extraction, that discovery belongs in the task discussion; it does not silently authorize a form redesign.

The overwrite choice can be recorded briefly:

> **D-01 — Existing identifiers in import**  
> **Status:** Proposed; implementation of overwrite behavior is blocked.  
> **Context:** Import may introduce new products, but existing stock must not be replaced accidentally.  
> **Options:** Reject the file, or replace matching quantities with an explicit overwrite policy.  
> **Decision:** Pending.

Suppose the product decision is to reject the entire file when any identifier already exists. Update the record to accepted, explain the consequence that stock corrections remain a separate workflow, and add the acceptance case: `P100,8` reports an existing-identifier error and leaves `P100: 4` unchanged.

![An import scope boundary permits preview and confirmation while retaining the existing validator and manual-entry behavior. Decision D-01 initially allows two interpretations of P100,8, then records an accepted rejection policy preserving quantity 4.](../assets/agentic-coding/boundaries-import.svg 'Fictional planning states. Reject and replace are alternatives before D-01 is resolved. The accepted policy matches the first article’s no-overwrite example; an accepted decision is not evidence that the code implements it.')

The independent preview layout can proceed while the policy is open, provided it does not encode a supposed answer. Manual-entry regression checks remain necessary. A record prevents the choice from disappearing; implementation and verification establish whether it was followed.

### An interface break does not authorize authentication redesign

Consider an invented HTTP client upgrade. Compatibility edits are permitted; authentication redesign is excluded. The old interface accepts a token value, while the new interface requests a token callback. These are fictional interfaces, not instructions for a particular library.

The agent proposes automatic refresh and a new session store. That could be a separate design, but the interface change alone does not establish its necessity.

Bound an investigation around one question: can a local adapter satisfy the new callback interface while preserving the existing credential lifecycle? Inspect when the callback is called and what happens for missing, expired, or changed credentials. Keep the probe isolated and attach its findings to the upgrade task.

If the adapter preserves the required behavior, continue within scope and verify it. If it cannot, present the evidence and alternatives: defer the upgrade or explicitly revise the scope to include the required authentication change. Do not bypass the existing rules to make the upgrade pass.

![A fictional client interface changes from a token value to a token callback. A bounded adapter investigation branches into continuing a compatible upgrade or returning a decision to defer or expand scope; authentication redesign remains outside the current task.](../assets/agentic-coding/boundaries-upgrade.svg 'The branches are conditional engineering choices, not measured investigation results. A proposed scope expansion needs an explicit decision; discovering a dependency does not itself authorize redesign.')

If scope changes, update the brief and prepare reviewable changes with their relevant checks. Google’s engineering guidance recommends separating substantial refactoring from behavior changes rather than obscuring both in one patch. [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)

### A prototype has a different boundary

Suppose the immediate question is whether an import preview makes row errors understandable. A local prototype may use synthetic rows, an in-memory list, and disposable interface code. Its brief excludes production credentials, external calls, and real inventory writes. Its deliverables are an inspectable interaction and observations about the question.

A production task may use the same sample file, but must connect to established validation, preserve real inventory during preview, and verify the relevant integration and failure behavior. “The prototype demonstrates the interaction” does not settle those obligations.

![Matched import-preview briefs share synthetic rows P201,3 and P202,-1. The prototype permits a disposable local interface and memory-only state; the production brief requires established validation and evidence that preview leaves inventory unchanged.](../assets/agentic-coding/boundaries-prototype.svg 'Same teaching fixture, different operating boundaries. The comparison describes intended work and evidence, not completed user research or a production-readiness assessment.')

Keep useful learning, then make a separate implementation decision about what to reuse. Fowler’s Sacrificial Architecture discusses deliberately replaceable designs while warning that expected replacement does not remove the need for internal quality. [Sacrificial Architecture](https://martinfowler.com/bliki/SacrificialArchitecture.html)

## Assumptions for correctness

The relevant participants must share the meaning of the boundaries and know how consequential decisions are resolved. Existing decisions must be discoverable and current.

A written instruction does not enforce isolation. A branch separates code changes; it does not prevent a tool from writing to a production service. Permissions, environments, and test data must support the stated boundary.

## When to use it

Use this pattern when a task touches shared behavior, data meaning, interfaces, or adjacent redesign opportunities. It is especially useful for upgrades, refactoring, exploratory work, and features with unresolved product choices.

A small local correction may need only one sentence naming the change and what stays intact.

## Tradeoffs and operating costs

Boundary notes and decision records require maintenance. Excessive detail can freeze incidental implementation choices or delay harmless work. Focus on consequential distinctions and unresolved assumptions.

Keep decisions linked to the work item and versioned near the affected code. GDS guidance explicitly recommends version control for architectural decisions and distinguishes decision acceptance from implementation. [The GDS Way](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html)

In an Agile workflow, use existing refinement and planning conversations to revisit discoveries. For Scrum teams, the Sprint Backlog’s scope can be renegotiated without changing the Sprint Goal; an initial task boundary need not become permanent. [Scrum Guide](https://scrumguides.org/scrum-guide.html)

## Common mistakes and limitations

Do not treat a non-goal as permission to ignore a necessary dependency. Report it, establish what cannot proceed, and identify work that remains independent.

Do not keep an assumption labeled as a settled constraint after evidence contradicts it. Revisit the decision, retaining the reason and linking any replacement rather than erasing the history.

An accepted decision is not a passing test, a completed agent task is not necessarily a completed feature, and an integrated change is not automatically a release. A decision record explains one choice; it is not a complete system specification.

## Related patterns

[[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]] turns a resolved choice into observable acceptance cases. [[preserve-the-invariants|Preserve the Invariants]] concentrates on retained properties; this pattern also distinguishes scope, assumptions, and open choices. [[separate-reversible-from-irreversible-decisions|Separate Reversible from Irreversible Decisions]] helps judge the commitment a choice creates. [[keep-a-decision-journal|Keep a Decision Journal]] supports later reflection on reasoning; a technical decision record additionally needs a discoverable current status and links to implementation work.

## Sources and further reading

- [Michael Nygard: Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — context, status, choice, and consequences.
- [The GDS Way: Documenting architecture decisions](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html) — versioning, implementation, and supersession.
- [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) — coherent changes and separate refactoring.
- [Martin Fowler: Sacrificial Architecture](https://martinfowler.com/bliki/SacrificialArchitecture.html) — replaceable designs and quality tradeoffs.
- [The Scrum Guide](https://scrumguides.org/scrum-guide.html) — adapting scope around the Sprint Goal.

The cases and diagrams are original illustrations. No client upgrade, importer, or prototype was executed or benchmarked for this article.
