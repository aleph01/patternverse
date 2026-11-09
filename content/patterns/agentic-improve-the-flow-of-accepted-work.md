---
id: agentic-improve-the-flow-of-accepted-work
type: pattern
title: 'Improve the Flow of Accepted Work'
summary: 'Improve the path from a useful request to an accepted, integrated result by observing queues, blocked work, and recurring rework, then testing a bounded process change.'
status: published
tags:
  - agentic-coding
  - flow
  - continuous-improvement
  - delivery
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis drawing on Kanban, Scrum, and DORA guidance. Scenarios, work identifiers, review findings, and numerical fixtures are hypothetical. Reference calculations and importer fixtures are bounded experiments, not measured team improvements.'
---

## Purpose and problem

Agents finish implementations faster than the team can inspect them. Pull requests accumulate, dependent branches drift, and the next useful importer capability remains unavailable. A dashboard shows more output while users still wait.

Improve the Flow of Accepted Work asks where useful requests stop progressing and changes that part of the engineering system. The intervention might be fewer concurrent starts, a clarified contract, a reusable failure fixture, or a better review handoff. Its success needs evidence beyond generated code.

## Core idea

Choose a useful unit of work and follow it from request to an accepted, integrated result. Observe unfinished work as well as completions. Change one consequential constraint, then inspect whether the whole path improves without sacrificing quality or hiding work.

The [Kanban Guide](https://kanbanguides.org/the-kanban-guide/) supports defining workflow boundaries, controlling work in progress, and observing throughput, age, and cycle time. Applying those ideas to agent briefs, revision evidence, and acceptance is the editorial synthesis here; it is not a benchmark of any coding agent.

## How it works

### Define the unit and its finish

Use a capability with inspectable acceptance criteria, such as “preview a CSV import and confirm valid rows without partial writes.” A story can contain several agent tasks and reviewable changes; a session, branch, commit, or pull request need not equal that capability.

Keep the following distinctions explicit in ordinary work records:

| State or agreement          | What it establishes                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| Generated                   | An implementation or artifact exists.                                                           |
| Agent stopping condition    | The delegated task can hand back its stated evidence and unresolved work.                       |
| Reviewed                    | The identified revision has received the required scrutiny; findings may still require changes. |
| Integrated                  | The changes are combined and checked with the relevant system.                                  |
| Product acceptance criteria | The requested behavior against which the result is assessed.                                    |
| Definition of Done          | The team's shared quality standard for a usable increment.                                      |
| Released                    | A version is made available to the intended users or environment.                               |
| Accepted                    | The agreed product criteria have supporting evidence in the assessed version.                   |

For this pattern, finish requires acceptance **and** integration. Record release separately and investigate accepted work that never reaches users. Acceptance and release can occur in different orders. In Scrum, the Definition of Done applies to the Increment; the Sprint Review is not a mandatory release gate. These distinctions follow the [Scrum Guide](https://scrumguides.org/scrum-guide.html), without requiring every team to adopt Scrum.

### Observe waiting, dependencies, and returns

Record request, start, review-ready, integration, acceptance, and release times where relevant. Track request-to-finish elapsed time, age of unfinished items, waiting for review, blocked reasons, and returns for rework. Include blocked time rather than restarting clocks when work becomes inconvenient. Retain withdrawn items separately from successful completions.

Connect task and review records to the revisions actually inspected. When a branch changes after approval, preserve that fact and check what needs renewed review. An agent's completion timestamp cannot substitute for integrated evidence. Version the acceptance examples and fixtures too: otherwise a changing requirement can look like a changing defect rate.

### Change one policy and inspect the result

A work-in-progress limit controls how much started, unfinished work the system carries, including waiting and blocked items. Choose its boundary explicitly. When it is reached, help review, verify, or unblock existing work before pulling another item. This redirects attention toward finishing; it does not create review capacity or resolve a dependency automatically.

State a hypothesis, changed policy, observation period, quality safeguards, and retain-or-revise decision. Use an existing retrospective or routine workflow discussion. Scrum's retrospective supports adapting tools, process, and quality practices; improvement need not wait for a new ceremony.

[DORA's measurement guidance](https://dora.dev/guides/dora-metrics/) combines delivery throughput with instability and warns against context-free comparisons and metric targets. Production deployment measures complement this article's request-to-acceptance view; neither counts customer benefit by itself.

## Worked examples

### Twelve arrive, four leave review

In a **hypothetical** review system, the initial queue is empty. Each working day, twelve distinct changes enter it before four complete review. There are no withdrawals, duplicates, or returns. The goal is to understand accumulation before authorizing more starts.

Conservation gives `remaining = previous + 12 − 4`. The queue grows by eight changes daily: 8, 16, 24, 32, and 40 after five working days. An independently executed event ledger reproduces these values. The four review completions might need revision or await integration; their accepted count is unknown.

![Hypothetical daily review ledger shows twelve arrivals and four review completions per day, leaving eight, sixteen, twenty-four, thirty-two, and forty queued changes; acceptance is unknown.](../assets/agentic-coding/flow-queue.svg 'Hypothetical conservation example: twelve arrivals minus four review completions add eight queued changes each day. Review completion is a different boundary from accepted, integrated work. Constant rates and no returns are assumptions, not forecasts.')

The diagnosis is an arrival/completion imbalance at this boundary. The proposed intervention is to stop expanding implementation starts and inspect why reviews wait. Scope, availability, findings, and integration may explain the restriction. The calculated result establishes accumulation under fixed assumptions, not a staffing prescription, real waiting-time estimate, or proof that agents caused congestion. Heterogeneous changes and feedback invalidate the constant-rate forecast.

### Finish one importer increment

Consider a **fictional** snapshot. Increment I18 covers preview and confirmation; B18 adds bulk scheduling. Four child tasks have started: C18 defines the shared error contract, V18 implements validation, U18 renders errors, and B18's implementation depends on that contract too. C18 waits for review while the other three wait for its decision. More generation cannot settle the unresolved row-number convention.

For a proposed ten-working-day experiment, agree to withdraw bulk scheduling from the current scope, preserving B18's history and recording the withdrawal. It contributes no accepted completion. Limit started, unfinished useful increments to one: I18. Its three unfinished child tasks remain visible; the limit does not magically make task-level WIP one. Finish C18's review, settle the contract, then complete V18 and U18 against it and verify the assembled behavior.

![Fictional initial state shows contract C18 waiting for review and V18, U18, and B18 blocked on it. A proposed policy withdraws B18 explicitly and focuses one increment I18 on contract resolution, implementation, and combined acceptance evidence.](../assets/agentic-coding/flow-focus.svg 'Fictional snapshot versus proposed experiment, not observed improvement. Dependency arrows mean “requires this contract”; sequence arrows in the proposal show planned work. B18 is recorded as withdrawn, never counted as accepted. I18 still has three unfinished child tasks.')

Record I18's request/start dates, review-ready and decision times, blocked intervals, inspected revisions, combined checks, acceptance, and release status. Compare review waiting, unfinished-item age, request-to-finish time, and rework with comparable earlier increments. Inspect any new queue outside the limit and retain failed or unfinished work in the account. Improvement would require repeated comparable observations showing shorter waits and useful completions without weaker checks or displaced backlog. **No subsequent team observations exist in this example.** One accepted increment would demonstrate completion, not establish the policy's causal effect.

### Turn a recurring error case into a durable check

Two **invented** review records, E18a and E18b, both find missing negative-quantity handling. A vague brief says “validate quantities”; reviewers repeatedly reconstruct the intended rule. The goal is to prevent this particular omission from surviving to first review.

Change the acceptance example: quantities must be whole and nonnegative; any invalid row rejects the batch without writes, reporting its one-based logical data row and error code. Version a reusable fixture alongside the brief. With baseline inventory `P100:4`, use:

| Input data rows, excluding header | Expected result                                             |
| --------------------------------- | ----------------------------------------------------------- |
| `P201,3`                          | Accept; add `P201:3`.                                       |
| `P201,-1`                         | Reject; row 1, `quantity_nonnegative`; inventory unchanged. |
| `P201,3` then `P202,-1`           | Reject; row 2, same code; inventory unchanged.              |

![Invented repeated review findings E18a and E18b lead to a versioned nonnegative-quantity example and three executable fixtures; the next iteration must inspect first-review omissions among eligible tasks and end-to-end acceptance evidence.](../assets/agentic-coding/flow-learning.svg 'The changed brief and fixture make a recurring omission inspectable. A bounded reference rejects negative and mixed batches while a deliberately incomplete implementation fails those fixtures. Future team defect frequency and process improvement remain unmeasured.')

In a constructed, in-memory reference, an implementation that accepts negative integers passes the valid case and fails both rejection fixtures. A corrected implementation passes all three; an intentionally wrong row offset is also detected. This establishes that the fixtures discriminate these faults, not that the real importer or its storage transaction is correct.

For the next iteration, count eligible importer tasks reaching first review and how many still have this omission before correction. Preserve fixture version, inspection coverage, scope, and other failure categories. E18a and E18b alone provide no eligible denominator. A passing fixture, lower recurrence among comparable tasks, and less resulting rework would support retaining the change; a better score caused by narrower inspection would not.

## Assumptions for correctness

The work boundary and event records must reflect actual progression. Compare items with sufficiently similar scope and quality obligations, and disclose changes in urgency, tool versions, review availability, or release constraints. Keep unfinished-item ages beside completion times to avoid overlooking work that never finishes.

Before-and-after observations can guide a practical decision without identifying its cause conclusively. [DORA's research FAQ](https://dora.dev/faq/) acknowledges changing samples and analytical uncertainty. General research associations cannot establish that a local WIP policy or coding agent caused a specific outcome.

## When to use it

Use this pattern when implementation output rises while review queues, dependencies, or recurring corrections grow. It also helps when retrospectives identify the same engineering problem repeatedly without changing preparation, tools, or verification.

## Tradeoffs and operating costs

Useful records take time, and restrictive limits can leave available capacity idle when work cannot be unblocked. Start with existing issue, review, and deployment evidence. Inspect whether the chosen limit needs adjustment; a comprehensive measurement platform is not a prerequisite.

## Common mistakes and limitations

Counting commits, tokens, or merged pull requests rewards units that may not represent useful outcomes. Smaller items can raise counts without improving value. Deleting blocked work from the board, restarting its clock, or counting withdrawals as deliveries conceals the problem.

Measure the work system, not individual developers or agents. Keep safeguards against escaped defects and weakened acceptance visible. Faster acceptance remains an intermediate result; user adoption and business usefulness require their own evidence.

## Related patterns

These four neighbors exist locally as **drafts**:

- [[agentic-agree-on-done|Agree on Done]] defines completion obligations; this pattern observes and changes the path through them.
- [[agentic-deliver-small-reviewable-changes|Deliver Small, Reviewable Changes]] shapes individual changes; this pattern evaluates waiting and rework across their delivery path.
- [[agentic-coordinate-concurrent-work|Coordinate Concurrent Work]] organizes parallel ownership and dependencies; this pattern determines whether concurrency is helping work finish.
- [[agentic-review-intent-and-risk|Review Intent and Risk]] guides review reasoning; this pattern uses recurring findings and waiting to improve preparation and flow.

## Sources and further reading

- [The Kanban Guide, May 2025](https://kanbanguides.org/the-kanban-guide/) — explicit workflow boundaries, WIP control, and flow measures. No particular numerical limit is prescribed here.
- [The Scrum Guide, November 2020](https://scrumguides.org/scrum-guide.html) — Definition of Done, Increment, release, and retrospective adaptation.
- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/) — delivery and instability measures, contextual interpretation, and measurement pitfalls; not an acceptance or customer-value measure.
- [DORA: Research FAQ](https://dora.dev/faq/) — replication, changing respondents, and limits of interpreting research differences.
