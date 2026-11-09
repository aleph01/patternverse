---
id: 'time-limited-collaboration'
type: 'pattern'
title: 'Time-Limited Collaboration'
summary: 'Bring teams into close joint work for a defined discovery goal, then review and deliberately change how they interact.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** How can teams solve an uncertain shared problem together without making intensive coordination their permanent way of working?

## What it is for

Imagine a hypothetical retailer introducing a delivery-date promise at checkout. The checkout team understands what customers need to see. The fulfillment team understands stock, warehouse capacity, and carrier constraints. Neither can specify the answer alone, and passing documents between them repeatedly produces new misunderstandings.

Time-Limited Collaboration gives them a deliberate period of close joint work to discover the answer. They agree what they need to learn, who will participate, and when they will review the arrangement.

The pattern applies between teams whose expertise must temporarily combine. It is especially useful while requirements, technical boundaries, or responsibilities are still uncertain. It does not require dissolving the existing teams or making every participant a permanent member of a new group.

## The core idea

**Invest in intensive joint work for a specific discovery purpose, with an agreed review point and an explicit decision about what follows.**

Team Topologies describes collaboration as teams working closely for a defined period when adaptability or discovery is needed. Its guidance distinguishes this from a long-running dependency in which teams must coordinate every change. [Team Topologies, _Team Interaction Modeling_](https://teamtopologies.com/key-concepts-content/team-interaction-modeling-with-team-topologies)

The period provides focus; the discovery goal provides a reason to spend scarce attention together. Both matter. A fixed end date without a useful question can become a deadline for producing an arbitrary artifact. A shared goal without review can become a standing committee.

This differs from ordinary coordination, where teams already understand their responsibilities and mainly synchronize commitments. It also differs from enabling help, where one team principally builds another’s capability. Collaboration brings different perspectives into joint problem-solving, with something important for both sides to discover.

## How it works

![Two continuing teams enter a bounded period of shared discovery. They agree a question, capacity, decision rights, and review point, then use evidence to choose independent delivery, a supported service interface, a revised boundary, or an explicitly renewed engagement.](../assets/organizational-design/time-limited-collaboration.svg)

**Name the uncertainty.** Identify what cannot yet be resolved through a normal service request or an existing agreement. In the retailer illustration, the issue is how to make a useful customer promise when available fulfillment information has limits—not simply to hold more cross-team meetings.

**Agree the scope and review point.** Specify the shared question, expected evidence, participants, and date for reviewing progress. Choose a period appropriate to the uncertainty and capacity available. There is no universal number of weeks that makes collaboration effective.

**Protect real capacity.** Each team commits people with relevant knowledge and access to decisions. Adjust their ordinary workload. A collaboration with priority on paper but no time in practice creates another queue rather than a working relationship.

**Make decisions workable.** Clarify which decisions participants can make and which need product, operational, or leadership approval. Maintain visible responsibilities for existing services and incidents. Shared work should not make it unclear who answers for a production failure or accepts a new ongoing obligation.

**Learn through joint work.** Use shared models, prototypes, examples, tests, and direct conversations. Keep decisions and assumptions visible so knowledge does not remain with whichever people attended a meeting. Work closely enough to expose disagreements before they become separate implementations.

**Review the evidence and choose the next interaction.** Teams might now deliver independently, consume a supported capability through an interface, or adopt clearer responsibilities. They may instead need a different boundary or another bounded period. Any extension should name the remaining question, capacity, and next review date.

**Make the transition explicit.** Assign ownership of outputs, support, compatibility, unfinished work, and future changes. Test that the next arrangement is usable. Ending the meetings while leaving ordinary delivery dependent on informal favors does not end the collaboration dependency.

## Why it works

When a problem is uncertain, frequent direct interaction can be cheaper than repeated misunderstandings. People can test assumptions immediately and combine knowledge that neither team has alone.

That intensity is costly, however. It draws attention away from each team’s other responsibilities and increases the amount everyone must keep in mind. A bounded engagement makes the investment visible and creates a decision point at which continued coordination must earn its place.

The result should be better understanding and a workable next arrangement. Success is not necessarily a new interface or a shipped feature. Discovering that the proposed boundary is unsuitable can be valuable if it prevents a permanent, poorly understood dependency.

## Examples

### Rockwell Automation’s design sprints in 2018

In a September 2018 firsthand account, Rachel Wilkins Patel described Rockwell Automation bringing product management, software engineering, testing, UX design, and technical leadership together to solve design problems during a design sprint. Low-fidelity designs supported discussion rather than attempting to settle every detail in advance. [Patel, _Case Study: Collaborative Engineering with Lean UX_, 10 September 2018](https://www.uxmatters.com/mt/archives/2018/09/case-study-collaborative-engineering-with-lean-ux.php)

Participants debated workflows, feasibility, and scope, then recorded technical direction in annotations to design assets. Prototypes were tested with users before production. The arrangement brought differing expertise into the same discovery work instead of relying entirely on sequential design documents.

This illustrates focused joint discovery within a bounded sprint. It is not evidence that Rockwell formally adopted the Team Topologies interaction mode, or that every participating discipline belonged to a separate stable team. The account does not document a universal engagement length or a final service-ownership transition. Those are additional design decisions for an inter-team application of this pattern.

### A delivery-promise interface: hypothetical example

Suppose the retailer’s checkout and fulfillment teams agree a three-week collaboration. They reserve named participants, adjust other commitments, and set a shared question: what delivery promise can checkout display reliably, including when fulfillment information is incomplete?

They test example orders, prototype the customer message, and discover that warehouse-level estimates are insufficient. Together they define a response containing a delivery window, its validity period, and an explicit unavailable result. They test how checkout responds to each case.

At the review, fulfillment accepts ownership of the estimate service and its supported behavior. Checkout owns presentation and customer-facing fallback behavior. They agree support and compatibility expectations, then return to separate delivery plans using that interface.

If the evidence instead showed that nearly every checkout change required joint fulfillment design, the review would reopen the boundary rather than declare success. The three-week duration and all implementation details here are illustrative, not a prescription or a reported company case.

## Useful when

- **Neither side can specify the answer alone.** The problem combines knowledge held by different teams.
- **Handoffs repeatedly expose new misunderstandings.** Written requirements are not resolving the uncertainty efficiently.
- **A new boundary needs discovery.** Teams must learn what an interface, capability, or allocation of responsibility should contain.
- **The investment can be protected and reviewed.** Participants have time, decision access, and a credible route to a different working arrangement.

## Common mistakes and limits

**Calling permanent dependency collaboration.** If ordinary changes continually require the same joint meetings, examine interfaces, ownership, and team boundaries.

**Setting a date without an exit question.** A calendar can end the engagement without making future work easier. Define what the review must establish.

**Adding meetings without shared work.** Status updates alone rarely expose the assumptions that joint discovery needs to test.

**Underfunding participation.** People juggling unchanged commitments cannot sustain meaningful collaboration. Make capacity tradeoffs explicit.

**Stopping before ownership is usable.** Outputs need maintainers, support arrangements, and routes for future decisions. A prototype alone does not supply them.

**Renewing automatically.** Extensions can be justified, but repeated renewal should trigger scrutiny of the problem, capacity, and intended boundary.

Urgent incident response may require a different command arrangement. Routine service consumption may need better documentation or reliability instead of joint discovery. Some work is inherently coupled enough to warrant a lasting team redesign rather than successive temporary engagements.

## Related patterns

- [[platform-team|Platform Team]] can turn a discovered shared capability into a supported internal product, reducing routine coordination afterward.
- [[enabling-team|Enabling Team]] provides focused capability-building help; its primary purpose differs from discovering a solution jointly across team responsibilities.
- [[teamwork-coordinate-dependencies-early|Coordinate Dependencies Early]] makes known commitments visible. Time-limited collaboration helps when the dependency itself is not yet understood well enough to plan.
