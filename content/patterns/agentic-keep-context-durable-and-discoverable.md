---
id: agentic-keep-context-durable-and-discoverable
type: pattern
title: 'Keep Context Durable and Discoverable'
summary: 'Keep stable project guidance small, link to task-specific evidence and decision history, and verify freshness when work resumes.'
status: published
tags:
  - agentic-coding
  - context
  - documentation
  - handoff
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on architecture decision records and published context-engineering accounts. All inventory decisions, handoffs, source paths, revisions, and RowReader contracts in the examples are fictional.'
---

## Purpose and problem

A new session asks why inventory quantities cannot contain fractions. The answer exists in an earlier conversation, but the agent cannot find it. Someone pastes the entire discussion into the next prompt, including abandoned ideas and obsolete setup advice. The decision survives, mixed with material that can mislead the next implementation.

Keep Context Durable and Discoverable preserves useful knowledge outside the conversation and gives future work a short route to it. Stable guidance stays readily available; detailed evidence is retrieved when relevant. The aim is continuity with visible sources and uncertainty, rather than a larger transcript.

## Core idea

Different kinds of context need different homes and update rules:

| Context            | Useful home                                             | Update trigger                                       |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------------- |
| Stable conventions | Small project guide with module links                   | A shared convention or normal workflow changes.      |
| Decision rationale | Versioned record with context, status, and consequences | New evidence changes or supersedes the decision.     |
| Transient progress | Task or handoff note linked to changes and results      | Work advances, blocks, or passes to another session. |
| External reference | Version-specific source link and relevance note         | The dependency or cited contract changes.            |

The guide is an index and a small amount of recurring guidance. It should not become a second copy of the code, the issue tracker, and every external manual.

Anthropic's context-engineering account describes retaining lightweight references and retrieving details as needed, alongside structured notes outside the context window. This supports the design direction here, without establishing a universal ideal prompt length or a guarantee of reliable recall. [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)

## How it works

Give important knowledge a discoverable entry point. Link the project guide to relevant module documentation, and link those modules to decisions and checks. A name such as “quantity representation” is more useful for retrieval than an unexplained record number alone.

Retain provenance: what was decided or observed, where its basis can be inspected, and which revision, configuration, or dependency version it concerns. Keep “not yet checked” explicit. A compressed summary must not turn “the adapter may handle row numbering” into “the adapter handles row numbering.”

When work resumes, read applicable project instructions and the current task, locate the relevant notes, and compare them with repository state. Inspect the actual changes and reproduce the smallest relevant check before relying on a previous result. Anthropic's long-running-agent engineering report combines progress artifacts with repository history and startup verification in a particular web-development harness; it is an implementation account, not a prescribed workflow for every team. [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)

Make updating context part of the affected work. The person or agent changing a convention proposes its documentation update; the responsible module reviewer checks it through the existing review process. Progress notes belong with the task and should be retired or marked historical when superseded. An accessible source with no freshness discipline is merely easy-to-find stale information.

## Worked examples

### Recover the reason for whole-unit inventory

In this fictional inventory system, a developer asks whether import should accept `P201,3.5` by rounding it. The current validator rejects fractions. Knowing that behavior does not explain whether it is intentional.

The small project guide links to `inventory/README.md`, which links the quantity rule to **INV-01: Whole-unit stock**. Its accepted decision states that the product currently counts discrete items, uses whole quantities at least zero, and rejects fractional input rather than silently rounding. The consequence is that weighed goods need a separate representation decision. The inventory module maintains the links.

The new session retrieves that record, the current `validateProduct` implementation, and its quantity cases. It does not need the RowReader manual to answer a product-policy question. An external parser reference remains discoverable for a later interface task.

![A small project guide links through the inventory module to INV-01 and validateProduct with its checks. Those inventory sources are selected for the fractional-quantity task; the RowReader reference remains indexed but is not retrieved.](../assets/agentic-coding/context-map.svg 'Fictional retrieval map. Highlighting identifies the selected evidence, not a universal source ranking. INV-01 explains the intended policy; current code and checks must still agree with it.')

The resulting response is to reject `3.5` and explain the reason, while identifying weighed goods as a new decision. If the record and implementation disagree, investigate that conflict. A decision record preserves intent; it does not prove conformance. Nygard's original ADR guidance keeps context, decision, status, consequences, and superseded records available to future developers. [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

### Hand off an unfinished import without promoting guesses

Suppose an import session ends after parser work and partial preview wiring. A fictional handoff identifies branch **codex/import-preview**, base **BASE-E**, head **IMPORT-F**, and uncommitted changes in `upload.ts` and `preview.ts`, captured by the labeled diff **PREVIEW-D1**. These identifiers describe teaching artifacts, not real repository history.

Its evidence record separates states:

| Claim                                     | Basis in the handoff                                                   | Status                         |
| ----------------------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| Parser handles negative quantities        | Focused result at IMPORT-F                                             | Passed for the recorded cases. |
| Preview reports CSV row numbers correctly | Run H-2 against IMPORT-F plus PREVIEW-D1 reports row 3; expected row 2 | Failed.                        |
| Confirmation revalidates inventory        | No inspected integration or completed check                            | Unknown; save path not wired.  |

H-2 uses `sku,quantity`, then `P201,3` and `P202,-1`; data-row numbering excludes the header. The next session checks that branch, head, and working changes still match the note. It opens the diff and reruns that case before investigating the adapter. If another change has landed, the earlier result becomes a lead to recheck rather than a current fact.

![A fictional handoff at IMPORT-F plus PREVIEW-D1 links parser completion to its focused check and preview failure to run H-2. Expected row 2 and observed row 3 remain separate; confirmation revalidation is unknown and the save path is unwired.](../assets/agentic-coding/context-handoff.svg 'The handoff names committed and uncommitted state and the evidence attached to each claim. It locates unfinished work; it does not back up that work, establish feature completion, or authorize integration or release.')

The handoff's next question is narrow: where is the header offset added twice? That is a hypothesis to investigate, not an established diagnosis. The note preserves the failed expectation and uncertainty so the next session can test the hypothesis instead of inheriting it as a rule.

### Resolve a stale API note using the right source

Continue the invented RowReader upgrade from [[agentic-ground-work-in-the-existing-system|Ground Work in the Existing System]]. An old note recommends `reader.parse(text)` and a list result, reflecting fictional version 1.8.0. The task now uses 2.1.0. Both the lockfile and loaded module identify that target version.

For the same `sku,quantity` header and `P201,3` row, the constructed 2.1.0 contract uses `reader.read(text, { header: true })`, returning separate `rows` and `issues`. The quantity remains the string `"3"` until the product-validation path converts and checks it.

For this interface question, the version-specific vendor contract is the relevant external source, corroborated by the resolved module and a focused adapter check. The old local note is historical evidence. Its location inside the repository does not make its signature current.

![A stale RowReader 1.8.0 note is compared with lockfile and loaded-module evidence for fictional 2.1.0 and its read contract. The current note is corrected and linked to the target contract; the old signature is retained only as historical migration context.](../assets/agentic-coding/context-stale.svg 'Constructed documentation repair using the same CSV operation. Evidence resolves the interface conflict; external reference material does not grant permission to expand the implementation task.')

Update the current note with the version, source, result shape, and verification scope. Label the old signature as historical migration context or link its superseding note; remove it from the active guide. Keep INV-01 as the product-policy source. Neither a vendor API page nor current code can independently authorize a change from whole-unit stock to fractional stock.

## Assumptions for correctness

Links and artifacts must remain accessible to the next session. An agent also needs a known starting point; storing a note somewhere does not ensure that any tool will load it automatically.

Treat retrieved logs, source comments, and external pages as evidence for their subject. They do not acquire authority to override the current request or applicable project instructions merely because retrieval found them. Surface genuine instruction conflicts instead of silently choosing the most convenient text.

## When to use it

Use this pattern when work crosses sessions, repeated questions uncover lost rationale, or teams copy long histories into prompts. A single local correction may need only a clear completion note and an existing module link.

## Tradeoffs and operating costs

Documentation takes maintenance, and selective retrieval adds lookup work. Prefer one current source with links over several competing copies. Keep updates alongside changes in ordinary refinement and review; a story need not correspond to one agent session, branch, or pull request.

Google's review guidance includes updating documentation when changes affect how users build, test, interact with, or release software. Apply that same review discipline to context that governs future work. [What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)

## Common mistakes and limitations

Do not equate storage volume with useful memory, dates with correctness, or concise prose with verified knowledge. Preserve failed checks and uncertainty when summarizing. Archive superseded guidance without leaving it on the active route.

A completed session is not necessarily a completed feature. Acceptance evidence, the team's Definition of Done, review, integration, and release remain separate obligations. A handoff communicates state; preserving recoverable code and a traceable change history require their own mechanisms.

## Related patterns

[[agentic-ground-work-in-the-existing-system|Ground Work in the Existing System]] discovers and verifies the starting context; this pattern makes useful findings retrievable and maintainable. [[agentic-make-boundaries-and-decisions-explicit|Make Boundaries and Decisions Explicit]] identifies decisions and constraints; durable context preserves their rationale and status. [[agentic-agree-on-done|Agree on Done]] limits completion claims to their evidence. [[keep-a-decision-journal|Keep a Decision Journal]] supports reflection on reasoning; project context additionally needs discoverable locations, current applicability, and operational handoffs.

## Sources and further reading

- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) — selective retrieval and structured notes.
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) — progress artifacts and restart checks in a particular harness.
- [Michael Nygard: Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — rationale, status, and supersession.
- [Google Engineering Practices: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) — documentation maintenance during review.

The decisions, handoff results, and dependency contracts are fictional. No memory system, coding-agent workflow, or upgrade was implemented or benchmarked for these cases.
