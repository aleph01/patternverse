---
id: bottlenecks-and-capacity-constraints
type: concept
title: Bottlenecks and Capacity Constraints
summary: Identify which required activity limits completed output, match incoming work to sustainable capacity, and reassess the whole workflow after changing the constraint.
status: published
tags:
  - structural-traps
  - dependency-and-feasibility
  - capacity
  - bottlenecks
  - queues
  - flow
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Rina's café has a queue of paid orders. The till can take orders quickly, but one equipped barista prepares every drink before it reaches the pickup counter. Orders arrive faster than that station can complete them.

Rina adds more space for order slips and asks the cashier to keep the line moving. Taking payment becomes smoother. Customers still wait for drinks, and unfinished orders keep accumulating.

In this hypothetical café, waiting space and fast order-taking do not increase the rate at which the limiting preparation stage can work.

## The underlying pattern

**A bottleneck is an activity whose available capacity limits a workflow's achievable output under the current conditions.** A **capacity constraint** is a limit on how much required work can be performed in a specified period. Here, capacity means processing rate, not storage space.

**Throughput** means completed drinks per service period in this article. It differs from starts, arrivals, and theoretical capacity.

For a simple serial workflow where every item visits every stage, throughput cannot exceed the smallest stage capacity. Demand or available input can limit it further. This is an upper bound: interruptions, defects, and poor coordination can prevent the system from attaining it.

Queueing theory provides mathematical treatments of waiting and service. Eliyahu Goldratt's **Theory of Constraints**, developed in the early 1980s, supplies a management approach: identify the constraint, use it effectively, align other activities, expand it when necessary, and reassess. That framework did not originate all bottleneck analysis. [Goldratt Research Labs](https://www.goldrattresearchlabs.com/introduction-to-toc)

## What keeps it going

Every accepted drink order must pass through order-taking, preparation, and handover. Speeding an already faster till sends more work toward the same constrained station. Busy staff and a growing pile of tickets can coexist with unchanged completed output.

The backlog is a **stock**: accumulated unfinished orders. Across the whole café process, accepted orders add work and handed-over drinks remove it. The local queue before preparation grows when paid orders enter faster than preparation starts remove them. Completing preparation transfers work to handover; it does not itself remove an uncollected drink from the whole-process boundary.

The constraint concerns usable processing capacity. A second barista helps only with the equipment, ingredients, competence, and uninterrupted time needed for parallel work. Two people waiting for the same exclusive machine may add little. Once preparation improves, handover or another required activity may become the next limit.

Customers asking about delayed orders could also interrupt preparation and reduce capacity further. That is a feedback hypothesis to investigate, not something the pipeline proves.

![Hypothetical qualitative illustration. Paid orders queue before a limiting preparation station. More ticket storage cannot prepare drinks. An independently equipped trained barista can expand preparation, after which handover may become the next limit. The local queue and whole-process unfinished orders have different exit boundaries. Change: Increase usable preparation capacity or change accepted load, then reassess the whole process. Limitation: Staff and equipment cost money. Same machine access may prevent parallel work; quality and handover capacity remain.](../assets/structural-traps/bottlenecks-tool-kits.svg "Hypothetical illustration. Process arrows carry orders between required stages. Storage changes waiting space; usable parallel preparation changes processing capacity. The backlog shrinks only while completed handovers exceed newly accepted orders, and another constraint may appear.")

## Why the obvious responses fail

**Speed up an unconstrained stage.** Faster order-taking cannot make the preparation station prepare more drinks. It may reduce order-taking effort or delay, but completed output still faces the same constraint.

**Keep everyone fully occupied.** Producing more intermediate work can inflate queues. Spare capacity elsewhere may be useful for absorbing variation or helping the constrained activity.

**Reprioritize everything as urgent.** Changing service order redistributes waiting. It does not automatically increase service capacity.

**Add a bigger queue.** A queue can absorb a temporary burst. Sustained excess arrivals keep increasing unfinished work until space, deadlines, or patience run out. Amazon engineers describe how backlogs can make recovery painfully slow; this is operational experience, not a universal effect-size estimate. [AWS Builders' Library](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/)

## Possible ways out

The interventions below combine established operations ideas with editorial judgment. First define the boundary: arrival at the café through handover, including all waiting between stages.

**Verify the limiting activity.** Compare usable capacity with the workload actually requiring it. Observe queues, completed output, interruptions, and changes in product mix. A large queue may reflect a recent outage or batching rather than a persistent bottleneck. Measure across representative periods before buying equipment.

**Recover capacity already being lost.** Supply complete instructions and ready materials; move clerical work away from the barista; prevent avoidable interruptions. Rina can implement these changes if staff and responsibilities permit. They help only when such losses exist. Cutting necessary checks would change the acceptance standard, not improve the same service.

**Control admission and release.** Match accepted orders or preparation releases to what the café can finish, with explicit waiting promises. Limits on work in progress can prevent uncontrolled internal accumulation. They do not erase demand: customers may wait outside the boundary or be turned away. AWS describes backpressure and overload controls as ways to manage this problem in asynchronous systems. [Operational account](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/)

**Increase effective capacity where it matters.** Add a trained barista with an independent equipped station, extend staffed hours, or redesign the required work. These require money, skills, and a genuinely usable resource. Adding a person who must share the same exclusive machine may add little capacity. Recheck the rest of the route after any improvement.

**Reduce or reshape the workload.** Defer optional services, simplify an approved task, or change the mix of accepted jobs. Name the reduced service and obtain authority from whoever owns that commitment. If demand must remain above sustainable completion capacity indefinitely, some combination of capacity, scope, admission, or promised delay must change.

## A worked example

### Improve preparation rather than the pile of tickets

Rina's larger ticket area fills because drinks still wait for preparation. She follows orders from acceptance to handover. The cashier and pickup counter sometimes have spare time while the barista's station remains occupied.

She first checks missing ingredients, machine downtime, unclear orders, and avoidable interruptions. Those problems would call for recovering existing capacity. In this hypothetical diagnosis, the station already works effectively during the rush; further improvement requires usable parallel preparation.

Rina funds another trained barista with an independently usable station. The menu and quality standard stay the same. In the stipulated outcome, more drinks are handed over and inherited unfinished work falls because completions exceed newly accepted orders for a recovery period. Added equipment alone would not establish either result.

Rina watches the entire route. The pickup counter may now need attention, and a later change in the mix of drinks can move the constraint. Once the backlog clears, output depends on continuing demand. Staff, space, equipment, and quieter-period idle capacity all cost money.

### When expansion is unavailable

Rina can instead slow acceptance, offer a truthful wait, or temporarily narrow the menu with authorization. These changes can contain internal accumulation while leaving customers to wait outside, choose something else, or leave. They change access or service scope; they do not erase the demand or manufacture preparation capacity.

## Limits and lookalikes

Even when mean arrivals are below capacity, variable arrivals and task durations can cause waiting. In the standard single-server model with Poisson arrivals, independent exponential service times, and unlimited waiting space, mean waiting grows sharply as utilization approaches one. That model supplies no universal recommended utilization percentage. [MIT queueing lectures](https://web.mit.edu/1.041/www/lectures/L8-queuing-models-2026sp.pdf)

John Little’s 1961 result relates average work in a stable system to its arrival rate and the average time spent there. More work waiting generally means a longer journey through the same stable process at the same throughput. The result requires consistent boundaries and stable finite averages; it is not a promise that removing items creates capacity, and the café’s indefinitely growing queue is not a steady-state case. [Little’s original paper](https://fisherp.scripts.mit.edu/wordpress/wp-content/uploads/2015/11/ContentServer.pdf)

A blocked item is not necessarily a bottleneck. Networks can also have several interacting constraints, shifting bottlenecks, shared resources, and rework loops; the smallest-box rule is not a complete model of those systems.

## Related patterns

[[teamwork-work-the-bottleneck|Work the Bottleneck]] develops the intervention: concentrate improvement on what limits useful delivery.

[[teamwork-limit-work-in-progress|Limit Work in Progress]] addresses accumulation and focus. A release limit controls exposure; it does not automatically increase processing capacity.

[[queue-based-load-leveling|Queue-Based Load Leveling]] buffers temporary bursts and controls their drain. A buffer cannot indefinitely reconcile excess arrivals with a lower completion rate.

## Sources and further reading

- [Goldratt Research Labs: Introduction to Theory of Constraints](https://www.goldrattresearchlabs.com/introduction-to-toc). Practitioner account of origins and the Five Focusing Steps; a management framework, not a universal one-bottleneck theorem.
- [John D. C. Little, _A Proof for the Queuing Formula: L = λW_ (1961)](https://fisherp.scripts.mit.edu/wordpress/wp-content/uploads/2015/11/ContentServer.pdf). Foundational mathematical result with explicit stochastic assumptions.
- [Cathy Wu, MIT: Queuing Models (2026)](https://web.mit.edu/1.041/www/lectures/L8-queuing-models-2026sp.pdf). Teaching treatment of service rates, stability, utilization, and model-specific waiting formulas.
- [AWS: Avoiding Insurmountable Queue Backlogs](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/). First-person engineering account of accumulation, recovery, and overload controls; its software setting limits direct transfer.
