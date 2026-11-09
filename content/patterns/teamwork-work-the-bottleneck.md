---
id: teamwork-work-the-bottleneck
type: pattern
title: Work the Bottleneck
summary: Direct improvement toward the constraint that limits the flow of useful work.
status: published
tags:
  - teamwork
  - collaboration
verses:
  - collaboration
attribution: Original Patternverse synthesis informed by the sources linked in
  this article. Invented cases are identified as hypothetical.
---

The team has plenty of drafts and very little published work. Writers are meeting their targets, but articles keep accumulating in technical review. The reviewer spends the day answering urgent messages about when each article will be ready.

The proposed solution is to produce drafts faster. Another suggestion is to ask the reviewer to work through the backlog over the weekend.

Both responses leave the central question unanswered: what is limiting publication, and how could the team change the conditions around it?

## The core move

**Identify what currently limits useful delivery, then concentrate improvement on that constraint and the work supporting it.**

A bottleneck is an activity whose available capacity limits the delivery rate of the wider workflow. A blocker prevents a particular item from progressing. One missing photograph may block an article; insufficient review capacity may hold back the entire publication process. Kanban University makes this distinction between a blocked item and a constrained activity. [Kanban Method Glossary](https://kanban.university/glossary/)

“Work the Bottleneck” is our descriptive title. Its main foundation is **Theory of Constraints**, particularly the Five Focusing Steps developed by Eliyahu Goldratt: identify the constraint, use its existing capacity effectively, align other work around it, expand capacity where needed, and reassess. [Five Focusing Steps](https://www.tocinstitute.org/five-focusing-steps.html)

The object of improvement is the workflow. When a person performs the constrained activity, the team needs to understand their responsibilities, inputs, tools, interruptions, and available support.

## Why effort elsewhere can disappoint

A workflow can produce only what its necessary stages can collectively complete. Once a constrained stage is fully supplied with usable work, sending more work toward it adds waiting rather than increasing its capacity.

A production-system tutorial from the Project Production Institute illustrates this relationship: increasing unfinished work eventually stops increasing output, while additional items spend longer waiting. The precise behavior depends on the system and its variability. [Technical explanation of WIP and capacity](https://projectproduction.org/journals/PPI-JOURNAL-TT-Optimal-Level-of-WIP-in-a-Production-System.pdf)

Local incentives can obscure this. Drafting more articles makes the writing team’s results look better. Helping prepare articles for review may produce fewer new drafts, even if it helps more articles reach readers.

The constrained activity can also lose capacity to work that others could perform: finding references, correcting formatting, chasing missing information, or responding to repeated priority changes.

DORA’s guidance on work-in-process limits recommends making the full delivery path visible and helping address constraints elsewhere in that path when local work cannot progress. [DORA: Work in process limits](https://dora.dev/capabilities/wip-limits/)

## Ten requests, four reviews

Consider a **hypothetical** customer-education team producing comparable setup guides. Ten new guides are requested each week. Its current capacities are:

- Drafting: twelve guides per week.
- Technical review: four per week.
- Publishing: eight per week.

In this simplified workflow, sustained delivery cannot exceed four guides per week. If ten drafts enter review every week and four leave, the review queue grows by six.

A proposed writing tool could raise drafting capacity to eighteen. That might save writing effort, but it would leave the publication ceiling unchanged.

Instead, the team examines what happens during review. The reviewer repeatedly receives incomplete examples, spends time locating the relevant product version, and loses planned review sessions to meetings.

The team first agrees what a review-ready guide must contain. Writers check links, reproduce examples, and supply version information before submission. A coordinator consolidates questions, and managers protect agreed review sessions.

These changes carry a trade-off. Writers spend more time preparing each submission, so their draft count may fall. Managers must also decide which meetings can proceed without the reviewer.

Suppose those changes raise effective review capacity from four to six guides per week. Demand still exceeds delivery, so the team next develops a second qualified reviewer, with time allocated for training and calibration.

For illustration, assume combined review capacity eventually reaches ten guides per week.

Publication can now rise—but only as far as the publishing stage permits. With drafting at twelve, review at ten, and publishing at eight, the new ceiling is eight.

Publishing is now the limiting stage. Releasing ten guides each week would create a growing queue there. The team must adjust its commitments and decide whether further publishing capacity is worth developing.

These figures explain the mechanism. They are invented capacity assumptions, not measured results or promises about what training or protected time will achieve.

## Finding the constraint before fixing it

Start with the intended result. For the example team, that is accurate, usable guides reaching readers. A count of reviewed drafts captures only part of that result.

Then trace recent work through the complete path. Look for a recurring queue of **ready** work, delayed handoffs, and downstream activities repeatedly waiting for the same stage. Compare the work arriving with what that stage can actually complete.

A large queue is a clue. It may reflect a temporary surge, unusually difficult items, or work that lacks the information needed to proceed. Those situations call for different responses.

A practical first step is to examine several delayed items with the people doing the suspected constrained work. Ask where their time goes and what repeatedly prevents completion. This diagnostic approach is a practical synthesis of the sources, rather than a formal test that proves a bottleneck exists.

Test the diagnosis through a bounded change. If clearer inputs and protected review sessions improve completed publication, the result supports the hypothesis. If reviewed work simply accumulates elsewhere, inspect the next stage.

## Supporting the constrained activity

The Five Focusing Steps provide a useful order:

1. **Identify:** establish what limits the system’s goal.
2. **Exploit:** make effective use of the capacity already available.
3. **Subordinate:** align other activities with that decision.
4. **Elevate:** increase capacity when existing arrangements remain insufficient.
5. **Repeat:** reassess rather than preserving yesterday’s solution.

Here, “exploit” concerns productive use of a resource. For a human activity, useful interventions include removing avoidable administration, supplying better inputs, and protecting focused time. Staffing and workload remain part of the decision. [Theory of Constraints Institute](https://www.tocinstitute.org/five-focusing-steps.html)

Keep enough suitable work ready to sustain progress, while controlling how much enters the workflow. An enormous queue is expensive; an empty queue caused by poor coordination can also waste scarce capacity.

An individual can improve a handoff, remove preparation work, or offer help. Changes to priorities, specialist responsibilities, budgets, and staffing require agreement from those accountable for them. Additional reviewers need competence and calibration, not simply permission to approve work.


![Three hypothetical guide-production workflows: capacities of 12 drafts, 4 reviews, and 8 publications limit delivery to 4 guides per week. Increasing drafting to 18 leaves the ceiling at 4. Improving review capacity to 10 raises the ceiling to 8, with publishing becoming the new constraint.](../assets/teamwork/work-the-bottleneck.svg "Improve the stage that limits delivery, then reassess the workflow.")

## When it helps—and when to look wider

This pattern is useful when one activity repeatedly governs completion and a focused intervention could change its performance.

The restriction may arise from scheduling or permissions. In another hypothetical team, several people could approve routine requests, but a rule sends every decision to one manager. Investigating the rule may reveal a better intervention than hiring an assistant.

Some workflows have shifting constraints, especially when item types and demand vary. Capacity estimates are less dependable when “one item” can mean either a minor update or a month of investigation. Production models themselves distinguish idealized fixed conditions from the effects of variability. [Project Production Institute](https://projectproduction.org/journals/PPI-JOURNAL-TT-Optimal-Level-of-WIP-in-a-Production-System.pdf)

If the entire system has spare capacity and little relevant demand, faster internal processing may offer limited benefit. If work is distributed across several interacting constraints, a single-stage explanation may be too narrow.

## Failure modes and signs of progress

One failure is to identify the busiest person and immediately assign them more responsibility. Activity alone does not establish what limits delivery.

Another is removing a necessary check to make the queue disappear. Throughput has little value if quality falls and the team later repairs the results.

A third is overfeeding the constrained stage. Better preparation should reduce friction; it should not become permission to start unlimited work.

Judge progress beyond the stage being changed:

- Are useful items reaching recipients more reliably?
- Is waiting declining across the full journey?
- Are errors and rework acceptable?
- Is the arrangement sustainable for the people involved?
- Has another activity begun to limit delivery?

Track comparable work over a representative period. A smaller review queue might reflect better flow—or fewer incoming requests. The sources provide a management approach and explanatory models; the local diagnosis still needs evidence.

## Neighboring patterns

[[teamwork-optimize-the-whole|Optimize the Whole]] establishes the outcome and boundaries that make a constraint meaningful. Work the Bottleneck concentrates effort within that wider view.

[[teamwork-limit-work-in-progress|Limit Work in Progress]] controls unfinished commitments so work does not accumulate indefinitely before the constrained activity.

[[teamwork-share-critical-knowledge|Share Critical Knowledge]] can expand qualified capacity when essential expertise is concentrated in one person. That investment takes time, and should preserve the judgment and quality the expertise provides.

## Best starting source

[Theory of Constraints Institute: Five Focusing Steps](https://www.tocinstitute.org/five-focusing-steps.html). Its decision sequence helps distinguish using existing capacity better, coordinating supporting work, and investing in additional capacity.
