---
id: agentic-agree-on-done
type: pattern
title: 'Agree on Done'
summary: 'Tie completion claims to evidence at the right level, distinguishing a finished agent task from a usable product increment and an authorized release.'
status: published
tags:
  - agentic-coding
  - acceptance
  - verification
  - delivery
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on the official Scrum Guide and documented engineering review practices. All task records, revisions, test results, and delivery states in the worked examples are fictional.'
---

## Purpose and problem

The agent says the import is done. Its parser checks pass, and the patch is ready to inspect. But nobody can upload a file, see a row error, or save the accepted products. The agent finished a component; the team heard a claim about a feature.

Agree on Done makes the subject of a completion claim explicit and connects it to inspectable evidence. A local task may finish while its parent feature remains incomplete. Keeping both facts visible lets work proceed without making progress appear larger than it is.

## Core idea

Four agreements answer different questions:

| Agreement               | Question it answers                                         | Import example                                                                   |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Acceptance criteria     | What must this requested change do?                         | Reject an existing SKU without changing inventory.                               |
| Definition of Done      | What shared quality state must completed product work meet? | Relevant checks, review, and integration satisfy the team's product standard.    |
| Task stopping condition | When should this agent stop and report?                     | Parser and its checks are ready for review; remaining integration is identified. |
| Release authorization   | May this version be made available now?                     | Follow the existing delivery process for the intended environment.               |

A reviewable patch is available for assessment; approval and integration are subsequent claims. Release may immediately follow integration in an automated process, or occur later. These distinctions do not require four meetings or four status fields.

In Scrum, the Definition of Done describes the Increment's required quality state. An Increment must be usable and work with previous Increments; the Sprint Review is not a release gate. Other Agile approaches can use the same completion distinctions without adopting Scrum terminology. [Scrum Guide](https://scrumguides.org/scrum-guide.html)

## How it works

Before implementation, name the task's deliverable, the conditions that close it, and obligations retained by the parent change. For each material claim, specify an evidence source: an executable case, a rendered interaction, a reviewed diff, or an integration result. A checkbox saying “tested” supplies neither the expectation nor the observed result.

Record the revision and relevant environment alongside the evidence. A passing check on yesterday's branch contents does not establish today's patch. If code, dependencies, or the integration base changes, reassess which results remain applicable. GitHub's optional branch protections illustrate this distinction through stale-review dismissal and checks against an up-to-date base; those settings must actually be configured. [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

Separate **passed**, **failed**, **not run**, and **not applicable**. When a required environment is unavailable, report the missing check and the next responsible step. The agent can stop as blocked or hand off its results without claiming success. Feature completion requires evidence for the integrated behavior, not merely completed child-task statuses.

## Worked examples

### The parser task closes before the import feature

This fictional case continues [[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]]. Inventory starts at `P100: 4`. The parser converts `P201,3` into a record and reports a negative quantity for `P202,-1`; it has no inventory access. Existing-SKU rejection belongs to the application path that can inspect inventory.

The agreed parser task stops when parsing and row-validation checks are inspectable, the interface is documented, and the handoff identifies integration gaps. Suppose that evidence is available at the fictional revision **PARSER-A**:

| Completion record      | Evidence available                                                 | Status                              |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| Parser task            | Records, row errors, focused checks, reviewable diff at PARSER-A   | Task complete; ready for review     |
| Import feature         | Upload, error display, confirmation, and persistence not connected | Incomplete                          |
| Existing-SKU criterion | `P100,8` must reject the file and preserve `P100: 4`               | Not yet verified in the application |

The task closes honestly because the parser was its agreed deliverable. If it had been assigned the complete import, the same evidence would be insufficient.

![Aligned parser-task and import-feature lanes at fictional revision PARSER-A. Parser records and row checks support task completion; upload, error display, confirmation, and persistence are still missing, so the feature remains incomplete.](../assets/agentic-coding/done-import.svg 'Fictional evidence at one point in the work. The lanes share the same revision; a completed component does not establish integrated acceptance behavior or the team’s Definition of Done.')

Later, an integrated check should exercise `P100,8` through upload and confirmation and inspect persisted inventory. Manual-entry regression evidence also remains relevant. Assign that follow-up in the existing work item so the gap survives the agent session. Even all component tasks being complete would not establish that their interfaces work together.

### A verified bug fix still has a delivery state

Consider a fictional search bug: equal scores produce unstable ordering. The agreed correction orders by descending score, then ascending identifier. With `A10: 8`, `A20: 8`, and `A30: 7`, the expected sequence is `A10, A20, A30`.

Use a reproducer that exposes the tie-order defect, then retain its corrected output and a regression case with unequal scores. A green run alone is insufficient if the test would also pass with the faulty behavior. Google's review guidance explicitly asks whether tests would fail when the code is broken and recommends checks appropriate to the change. [What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)

Suppose the evidence and review apply to fictional **FIX-B**. The change then integrates as **MAIN-C**, where the relevant checks pass against the combined code. The completion note names both revisions and links their results. Under this example team's quality standard, the fix is complete in the usable increment. The currently served build remains **LIVE-A**; rollout follows its separate delivery process.

![A fictional search fix progresses from a tie-order reproducer through FIX-B verification and review to MAIN-C integration checks. A separate release boundary shows LIVE-A still serving while rollout of MAIN-C remains pending.](../assets/agentic-coding/done-fix.svg 'Arrows indicate the example’s evidence and work sequence, not a universal branching model. MAIN-C has integration evidence; release authorization and production observation remain separate. The identifiers are fictional, not repository commits.')

The ordering check does not establish consistency between pagination requests. That was a separate requirement in the first article. If it belongs to this bug's acceptance criteria, it needs its own evidence before the fix can close.

### Documentation needs relevant evidence

A fictional documentation task corrects a CSV example from `P202,-1` labeled “accepted” to `P202,0`, consistent with the established non-negative rule. It also repairs a link to the import reference. Application code and the import policy remain unchanged.

At fictional **DOC-D**, the evidence record names the rule checked, the corrected sample, the resolved destination, the rendered desktop and phone views, and a diff confined to the requested documentation. That supports “documentation ready for review.” Required review and integration still follow the team's workflow.

![A compact documentation evidence record at fictional revision DOC-D links the corrected P202,0 example to rule accuracy, a checked reference destination, rendered views, and a scoped diff. Application runtime checks are explicitly outside this task’s evidence.](../assets/agentic-coding/done-docs.svg 'Proportionate evidence for a fictional documentation-only change. Runtime tests are not applicable because executable behavior is unchanged; this does not waive relevant documentation checks or an applicable repository requirement.')

Application runtime tests add no direct evidence about this prose correction. Mark them not applicable with that reason rather than reporting them as passed. If the page contains executable examples or changes generated behavior, reassess the classification. Publication also needs its own recorded result when requested.

## Assumptions for correctness

The completion standard must describe the actual product and remain accessible to agents and reviewers. Evidence must correspond to the claimed version, exercise meaningful expectations, and be available to whoever accepts the result.

An agent can perfectly satisfy a weak stopping condition. Agreement makes that condition visible; it does not make it sufficient. Review the standard when escaped defects expose missing obligations.

## When to use it

Use this pattern when work spans sessions, agents, components, or delivery stages, or when “tests pass” is being treated as “feature delivered.” It also helps small changes by making a proportionate stopping condition explicit.

## Tradeoffs and operating costs

Evidence records can become stale or ceremonial. Prefer links to existing results over copied logs, and reuse the team's work items and review process. One story can span several sessions and patches; one coherent change can satisfy several tasks.

Keep the quality standard demanding but relevant. Google's review standard favors changes that improve code health without requiring perfection; it does not excuse failing applicable requirements. [The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)

## Common mistakes and limitations

Do not count blocked checks as successful, weaken acceptance criteria after a failure merely to close the task, or treat approval as production observation. Preserve explicit follow-ups when the agent's permitted work ends.

Integration can invalidate earlier assumptions, and automated checks cover only their assertions. Completion records support a bounded conclusion about the work; they are not guarantees against every future defect.

## Related patterns

[[agentic-specify-outcomes-with-examples|Specify Outcomes with Examples]] defines intended behavior; Agree on Done identifies which evidence closes which level of work. [[agentic-make-boundaries-and-decisions-explicit|Make Boundaries and Decisions Explicit]] governs permitted changes and unresolved choices. [[ml-behavioral-testing|Behavioral Testing]] develops executable expectations for models; it does not define software delivery status. [[writing-match-the-claim-to-the-evidence|Match the Claim to the Evidence]] calibrates conclusions generally; this pattern applies that discipline to engineering completion and handoffs.

## Sources and further reading

- [The Scrum Guide](https://scrumguides.org/scrum-guide.html) — Increment, Definition of Done, and release distinctions.
- [Google Engineering Practices: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) — meaningful tests, functionality, and documentation.
- [Google Engineering Practices: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html) — quality and proportionate review.
- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) — configurable review freshness and integration requirements.

The completion records and diagrams are original teaching cases. No parser, search fix, application release, or agent evaluation was performed for them.
